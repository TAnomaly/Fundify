// 🎯 HIZLI TİER OLUŞTURMA SCRIPT'İ
// 1. tmirac ile login ol
// 2. F12 → Console
// 3. Bu script'i KOPYALA ve ÇALIŞTIR

(async function() {
  console.log('🚀 Starting tier creation...');
  
  const token = localStorage.getItem('authToken');
  if (!token) {
    alert('❌ Önce login ol!');
    return;
  }

  // Backend URL'leri dene (önce Vercel env, sonra fallback'ler)
  const backendUrls = [
    'https://fundify-backend-production.up.railway.app/api',
    'https://web-production-5d89.up.railway.app/api',
    'https://perfect-happiness-production.up.railway.app/api',
  ];

  let workingUrl = null;
  
  // Backend URL'i bul
  for (const url of backendUrls) {
    try {
      console.log(`Testing: ${url}`);
      const res = await fetch(`${url.replace('/api', '')}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        workingUrl = url;
        console.log(`✅ Working URL found: ${url}`);
        break;
      }
    } catch (e) {
      console.log(`❌ ${url} failed`);
    }
  }

  if (!workingUrl) {
    alert('❌ Backend bulunamadı! Railway deployment kontrol et.');
    console.error('No working backend URL found');
    return;
  }

  try {
    // Get user
    console.log('1️⃣ Getting user info...');
    const userRes = await fetch(`${workingUrl}/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const userData = await userRes.json();
    
    if (!userData.success) {
      alert('❌ User bilgisi alınamadı!');
      console.error('User error:', userData);
      return;
    }
    console.log('✅ User:', userData.data.name);

    // Get campaign
    console.log('2️⃣ Getting creator campaign...');
    const campRes = await fetch(`${workingUrl}/campaigns?type=CREATOR`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const campsData = await campRes.json();
    
    const campaign = campsData.data?.campaigns?.find(c => c.creatorId === userData.data.id);
    
    if (!campaign) {
      alert('❌ Creator campaign yok! Önce /creator-dashboard → "Become Creator" yap.');
      console.error('No campaign found');
      return;
    }
    console.log('✅ Campaign:', campaign.title);

    // Create tier
    console.log('3️⃣ Creating tier...');
    const tierRes = await fetch(
      `${workingUrl}/memberships/campaigns/${campaign.id}/tiers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: 'Gold Member',
          description: 'Get exclusive access to all my premium content',
          price: 9.99,
          interval: 'MONTHLY',
          perks: [
            '🎯 Early access to new content',
            '💎 Exclusive behind-the-scenes posts',
            '🎤 Monthly Q&A sessions',
            '💬 Discord server access'
          ]
        })
      }
    );

    const tierData = await tierRes.json();
    
    if (tierData.success) {
      console.log('✅ SUCCESS! Tier created:', tierData.data);
      alert('🎉 Tier başarıyla oluşturuldu!\n\nŞimdi sayfayı yenileyeceğim...');
      setTimeout(() => window.location.reload(), 1500);
    } else {
      console.error('❌ Tier creation failed:', tierData);
      alert('❌ Tier oluşturulamadı: ' + (tierData.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('❌ Script error:', error);
    alert('❌ Hata: ' + error.message);
  }
})();
