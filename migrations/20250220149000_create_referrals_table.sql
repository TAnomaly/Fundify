-- Create referral_codes table
CREATE TABLE IF NOT EXISTS referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    max_uses INTEGER NOT NULL DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create referral_uses table for tracking usage
CREATE TABLE IF NOT EXISTS referral_uses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(referral_code_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_referral_codes_creator_id ON referral_codes(creator_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_is_active ON referral_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_referral_codes_expires_at ON referral_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_referral_uses_referral_code_id ON referral_uses(referral_code_id);
CREATE INDEX IF NOT EXISTS idx_referral_uses_user_id ON referral_uses(user_id);
