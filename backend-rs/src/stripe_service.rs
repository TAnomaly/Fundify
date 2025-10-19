use anyhow::Result;
use serde::{Deserialize, Serialize};
use stripe::{Client, CreateCheckoutSession, CreateCustomer, CreatePrice, CreateProduct, CreateBillingPortalSession, IdOrCreate, Metadata, Price, Product, Subscription};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct StripeService {
    client: Client,
    publishable_key: String,
    webhook_secret: String,
    frontend_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StripeConfig {
    pub publishable_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCheckoutSessionRequest {
    pub tier_id: Uuid,
    pub creator_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckoutSessionResponse {
    pub session_id: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortalSessionResponse {
    pub url: String,
}

impl StripeService {
    pub fn new(secret_key: String, publishable_key: String, webhook_secret: String, frontend_url: String) -> Self {
        let client = Client::new(secret_key);
        Self {
            client,
            publishable_key,
            webhook_secret,
            frontend_url,
        }
    }

    pub fn get_config(&self) -> StripeConfig {
        StripeConfig {
            publishable_key: self.publishable_key.clone(),
        }
    }

    pub async fn get_or_create_customer(&self, user_id: Uuid, email: String, name: Option<String>) -> Result<String> {
        // Search for existing customer by email
        let customers = self.client.customers().list(&stripe::ListCustomers::new()).send().await?;
        
        if let Some(customer) = customers.data.into_iter().find(|c| c.email == Some(email.clone())) {
            return Ok(customer.id.to_string());
        }

        // Create new customer
        let mut customer_params = CreateCustomer::new();
        customer_params.email = Some(email);
        customer_params.name = name;
        customer_params.metadata = Some(Metadata::from([("userId".to_string(), user_id.to_string())]));

        let customer = self.client.customers().create(&customer_params).send().await?;
        Ok(customer.id.to_string())
    }

    pub async fn create_checkout_session(
        &self,
        user_id: Uuid,
        user_email: String,
        user_name: Option<String>,
        tier_id: Uuid,
        creator_id: Uuid,
        campaign_id: Uuid,
        tier_name: String,
        tier_description: String,
        tier_price: f64,
        tier_interval: String,
        creator_name: String,
    ) -> Result<CheckoutSessionResponse> {
        // Get or create customer
        let customer_id = self.get_or_create_customer(user_id, user_email, user_name).await?;

        // Create or get product
        let product = self.create_or_get_product(tier_id, campaign_id, creator_id, tier_name, tier_description, creator_name).await?;

        // Create or get price
        let price = self.create_or_get_price(tier_id, product.id.to_string(), tier_price, tier_interval).await?;

        // Create checkout session
        let mut session_params = CreateCheckoutSession::new(&self.frontend_url);
        session_params.customer = Some(IdOrCreate::Id(customer_id));
        session_params.mode = Some(stripe::CheckoutSessionMode::Subscription);
        session_params.payment_method_types = Some(vec![stripe::PaymentMethodType::Card]);
        session_params.line_items = Some(vec![stripe::CreateCheckoutSessionLineItems::new(price.id.to_string(), 1)]);
        session_params.success_url = Some(format!("{}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}", self.frontend_url));
        session_params.cancel_url = Some(format!("{}/subscription/cancelled", self.frontend_url));
        session_params.metadata = Some(Metadata::from([
            ("userId".to_string(), user_id.to_string()),
            ("tierId".to_string(), tier_id.to_string()),
            ("creatorId".to_string(), creator_id.to_string()),
            ("campaignId".to_string(), campaign_id.to_string()),
        ]));
        session_params.subscription_data = Some(stripe::CreateCheckoutSessionSubscriptionData {
            metadata: Some(Metadata::from([
                ("userId".to_string(), user_id.to_string()),
                ("tierId".to_string(), tier_id.to_string()),
                ("creatorId".to_string(), creator_id.to_string()),
                ("campaignId".to_string(), campaign_id.to_string()),
            ])),
            ..Default::default()
        });

        let session = self.client.checkout_sessions().create(&session_params).send().await?;

        Ok(CheckoutSessionResponse {
            session_id: session.id.to_string(),
            url: session.url.unwrap_or_default(),
        })
    }

    pub async fn create_portal_session(&self, customer_id: String) -> Result<PortalSessionResponse> {
        let mut portal_params = CreateBillingPortalSession::new(customer_id);
        portal_params.return_url = Some(format!("{}/subscriptions", self.frontend_url));

        let session = self.client.billing_portal_sessions().create(&portal_params).send().await?;

        Ok(PortalSessionResponse {
            url: session.url,
        })
    }

    async fn create_or_get_product(
        &self,
        tier_id: Uuid,
        campaign_id: Uuid,
        creator_id: Uuid,
        tier_name: String,
        tier_description: String,
        creator_name: String,
    ) -> Result<Product> {
        // Search for existing product
        let products = self.client.products().list(&stripe::ListProducts::new()).send().await?;
        
        if let Some(product) = products.data.into_iter().find(|p| {
            p.metadata.get("tierId") == Some(&tier_id.to_string())
        }) {
            return Ok(product);
        }

        // Create new product
        let mut product_params = CreateProduct::new(&format!("{} - {}", creator_name, tier_name));
        product_params.description = Some(tier_description);
        product_params.metadata = Some(Metadata::from([
            ("tierId".to_string(), tier_id.to_string()),
            ("campaignId".to_string(), campaign_id.to_string()),
            ("creatorId".to_string(), creator_id.to_string()),
        ]));

        let product = self.client.products().create(&product_params).send().await?;
        Ok(product)
    }

    async fn create_or_get_price(
        &self,
        tier_id: Uuid,
        product_id: String,
        price: f64,
        interval: String,
    ) -> Result<Price> {
        // Search for existing price
        let prices = self.client.prices().list(&stripe::ListPrices::new().product(&product_id)).send().await?;
        
        let stripe_interval = if interval == "MONTHLY" { stripe::PriceRecurringInterval::Month } else { stripe::PriceRecurringInterval::Year };
        let amount_cents = (price * 100.0) as i64;

        if let Some(price) = prices.data.into_iter().find(|p| {
            p.unit_amount == Some(amount_cents) && 
            p.recurring.as_ref().map(|r| r.interval) == Some(stripe_interval)
        }) {
            return Ok(price);
        }

        // Create new price
        let mut price_params = CreatePrice::new(&product_id, amount_cents, stripe::Currency::Usd);
        price_params.recurring = Some(stripe::CreatePriceRecurring {
            interval: stripe_interval,
            ..Default::default()
        });
        price_params.metadata = Some(Metadata::from([("tierId".to_string(), tier_id.to_string())]));

        let price = self.client.prices().create(&price_params).send().await?;
        Ok(price)
    }
}
