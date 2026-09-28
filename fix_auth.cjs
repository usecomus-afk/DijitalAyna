const fs = require('fs');
let content = fs.readFileSync('public/auth-bridge.html', 'utf8');

const replacement = `function returnToApp(user, providerName) {
      if (isRedirecting) return;
      isRedirecting = true;

      setStatus("Giris basarili! Lutfen asagidaki butona tiklayarak uygulamaya donun.", false);
      const isApple = providerName === 'apple' || (user.providerData && user.providerData.some(p => p.providerId === 'apple.com'));
      const providerStr = isApple ? 'apple' : 'google';
      const defaultName = isApple ? 'Apple Kullanicisi' : 'Google Kullanicisi';

      const name = encodeURIComponent(user.displayName || defaultName);
      const email = encodeURIComponent(user.email || '');
      const picture = encodeURIComponent(user.photoURL || '');
      const returnUrl = \`dijitalmentalikizim://auth-callback?provider=\${providerStr}&name=\${name}&email=\${email}&picture=\${picture}\`;

      if (btnAppleEl) btnAppleEl.style.display = "none";
      if (btnGoogleEl) btnGoogleEl.style.display = "none";

      if (btnReturnEl) {
        btnReturnEl.href = returnUrl;
        btnReturnEl.style.display = "flex";
        btnReturnEl.style.backgroundColor = "#C0674F";
        btnReturnEl.style.color = "white";
        btnReturnEl.style.padding = "16px";
        btnReturnEl.style.fontSize = "16px";
        btnReturnEl.style.fontWeight = "bold";
        btnReturnEl.innerHTML = "✨ Uygulamaya Dön ✨";
      }

      // Automatically trigger deep-link navigation
      try {
        window.location.replace(returnUrl);
      } catch (_) {
        window.location.href = returnUrl;
      }
    }`;

content = content.replace(/function returnToApp\([\s\S]*?catch \(\_\) \{\s*window\.location\.href = returnUrl;\s*\}\s*\}/, replacement);
fs.writeFileSync('public/auth-bridge.html', content);
