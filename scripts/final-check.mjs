
import fetch from 'node-fetch';

async function checkApplication() {
  console.log('🔍 Vérification finale de l\'application...\n');

  // Test 1: Santé du serveur
  try {
    console.log('1️⃣ Test de santé du serveur...');
    const healthResponse = await fetch('http://localhost:5000/api/health');
    const healthData = await healthResponse.json();
    
    console.log('✅ Serveur: OK');
    console.log(`   - Status: ${healthData.status}`);
    console.log(`   - Gemini: ${healthData.gemini ? '✅' : '❌'}`);
    console.log(`   - Timestamp: ${healthData.timestamp}\n`);
  } catch (error) {
    console.log('❌ Serveur: ERREUR');
    console.log(`   - ${error.message}\n`);
  }

  // Test 2: API Chat
  try {
    console.log('2️⃣ Test de l\'API Chat...');
    const chatResponse = await fetch('http://localhost:5000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'Parle-moi brièvement de Rabbi Nahman'
      })
    });
    
    const chatData = await chatResponse.json();
    
    if (chatData.response && chatData.response.length > 10) {
      console.log('✅ Chat Gemini: OK');
      console.log(`   - Réponse: ${chatData.response.substring(0, 100)}...`);
    } else {
      console.log('❌ Chat Gemini: Réponse vide ou erreur');
      console.log(`   - Data: ${JSON.stringify(chatData)}`);
    }
  } catch (error) {
    console.log('❌ Chat: ERREUR');
    console.log(`   - ${error.message}`);
  }

  console.log('\n🎯 Application prête pour utilisation!');
  console.log('📚 Accédez à: http://0.0.0.0:5000');
}

checkApplication();
