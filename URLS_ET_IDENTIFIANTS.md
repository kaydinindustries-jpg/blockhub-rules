# 🔗 URLs et Identifiants - Référence Rapide

## 📋 Informations Générales

| Élément | Valeur |
|---------|--------|
| **Nom de l'extension** | BlockHub |
| **Compte GitHub** | kaydinindustries-jpg |
| **Email de contact** | kaydin.industries@gmail.com |
| **Repo GitHub** | blockhub-rules |
| **Branche principale** | main |

---

## 🌐 URLs du Dépôt GitHub

### Interface Web

- **Page du repo** : https://github.com/kaydinindustries-jpg/blockhub-rules
- **Créer un nouveau repo** : https://github.com/new
- **Paramètres SSH** : https://github.com/settings/keys
- **Profil** : https://github.com/kaydinindustries-jpg

### Git (HTTPS)

```bash
# Clone
git clone https://github.com/kaydinindustries-jpg/blockhub-rules.git

# Remote URL
https://github.com/kaydinindustries-jpg/blockhub-rules.git
```

### Git (SSH)

```bash
# Clone
git clone git@github.com:kaydinindustries-jpg/blockhub-rules.git

# Remote URL
git@github.com:kaydinindustries-jpg/blockhub-rules.git
```

---

## 🚀 URLs jsDelivr CDN

### Index Manifest

```
https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/index.json
```

### Fichiers de Règles

```
https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/cdn/v1/ai_terms.json
https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/cdn/v1/ai_widget_selectors.json
https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/cdn/v1/cookie_patterns.json
https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/cdn/v1/kill_list.json
https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/cdn/v1/preserve_list.json
```

### Purge du Cache jsDelivr

```
https://purge.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/index.json
https://purge.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/cdn/v1/kill_list.json
```

### Statut jsDelivr

```
https://status.jsdelivr.com
```

---

## 🔐 Configuration SSH

### Emplacement des Clés

```bash
# Clé privée
/Users/aydinkerem/.ssh/id_ed25519_github

# Clé publique
/Users/aydinkerem/.ssh/id_ed25519_github.pub

# Configuration SSH (optionnel)
/Users/aydinkerem/.ssh/config
```

### Contenu Suggéré pour ~/.ssh/config

```
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_github
    AddKeysToAgent yes
```

### Commandes de Test

```bash
# Tester la connexion SSH
ssh -T git@github.com

# Lister les clés chargées
ssh-add -l

# Ajouter une clé à l'agent
ssh-add ~/.ssh/id_ed25519_github
```

---

## 📂 Chemins Locaux

### Extension

```bash
# Dossier principal
/Users/aydinkerem/Desktop/UniBlock

# Fichiers de règles (source)
/Users/aydinkerem/Desktop/UniBlock/rules/cdn/v1/

# Fichiers de fallback
/Users/aydinkerem/Desktop/UniBlock/utils/

# Index avec hashes
/Users/aydinkerem/Desktop/UniBlock/index.json

# Scripts
/Users/aydinkerem/Desktop/UniBlock/utils/generate_index.js
/Users/aydinkerem/Desktop/UniBlock/update_rules.sh
/Users/aydinkerem/Desktop/UniBlock/test_integrity.js
```

### Dépôt GitHub (après clonage)

```bash
# Dossier principal
/Users/aydinkerem/Desktop/blockhub-rules

# Fichiers de règles
/Users/aydinkerem/Desktop/blockhub-rules/cdn/v1/

# Index
/Users/aydinkerem/Desktop/blockhub-rules/index.json
```

---

## 🔧 Chrome Extension

### URLs Chrome

```
# Page des extensions
chrome://extensions

# Recharger l'extension
chrome://extensions → Cliquer sur "Recharger" sous BlockHub

# Console du service worker
chrome://extensions → Cliquer sur "Service Worker" sous BlockHub
```

### Identifiant de l'Extension

L'ID sera généré automatiquement par Chrome lors de l'installation. Il ressemblera à :

```
abcdefghijklmnopqrstuvwxyz123456
```

Vous pouvez le trouver sur la page `chrome://extensions` sous le nom de l'extension.

---

## 📊 Hashes SHA-256 Actuels

Ces hashes sont valides au moment de la génération. Ils changeront à chaque mise à jour des règles.

```json
{
  "aiTerms": "39b97215cec5a6ebaa791892dcd954a8b37838caf06d7bfdb7794f404dc58914",
  "aiWidgetSelectors": "93dd6732eaa955993a15ba400e3ee1e1e66ba9efd48db725ff9ff4a4bc43c511",
  "cookiePatterns": "3943c95bec7e1c85e27156cd03dff28d16389ff346efbdd2bde9f6da99249747",
  "killList": "ba2a1ebe0135ae8f829698ebc4873950d0c6464c33469595c313cc8e6ccdbb9e",
  "preserveList": "091c81ad31b54a601f45178370c48d5f430acf03f2a0ffac8561ac3cc4d86b48"
}
```

**Note** : Ces hashes sont automatiquement régénérés par `node utils/generate_index.js`.

---

## 🛠️ Commandes Utiles

### Vérifier les URLs CDN

```bash
# Tester l'index
curl -I "https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/index.json"

# Télécharger et afficher l'index
curl -s "https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/index.json" | jq .

# Tester un fichier de règles
curl -I "https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/cdn/v1/kill_list.json"
```

### Vérifier les Hashes Localement

```bash
# Calculer le hash d'un fichier
shasum -a 256 ~/Desktop/UniBlock/rules/cdn/v1/kill_list.json

# Comparer avec l'index
cat ~/Desktop/UniBlock/index.json | grep -A 3 killList
```

### Mettre à Jour les Règles

```bash
# Méthode automatique
cd ~/Desktop/UniBlock
./update_rules.sh

# Méthode manuelle
cd ~/Desktop/UniBlock
cp rules/cdn/v1/*.json utils/
node utils/generate_index.js
git add .
git commit -m "Update rules"
git push origin main
```

---

## 📞 Support et Documentation

### Documentation Locale

- `WHAT_YOU_NEED_TO_DO.md` - Checklist rapide
- `COMMANDES_A_COPIER.md` - Commandes à copier-coller
- `GITHUB_SETUP_GUIDE.md` - Guide de configuration GitHub
- `SECURITY_AND_UPDATES.md` - Guide de sécurité complet
- `TECHNICAL_SUMMARY.md` - Résumé technique détaillé

### Ressources Externes

- **GitHub Docs** : https://docs.github.com
- **jsDelivr Docs** : https://www.jsdelivr.com/documentation
- **Chrome Extensions** : https://developer.chrome.com/docs/extensions
- **Web Crypto API** : https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API

### Contact

- **Email** : kaydin.industries@gmail.com
- **GitHub Issues** : https://github.com/kaydinindustries-jpg/blockhub-rules/issues (après création du repo)

---

## 🔒 Informations Sensibles

### ⚠️ NE JAMAIS PARTAGER

- ❌ Clé privée SSH (`~/.ssh/id_ed25519_github`)
- ❌ Passphrase de la clé SSH
- ❌ Mot de passe GitHub
- ❌ Tokens d'accès personnel (PAT)

### ✅ Peut Être Public

- ✅ Clé publique SSH (`~/.ssh/id_ed25519_github.pub`)
- ✅ Nom d'utilisateur GitHub (kaydinindustries-jpg)
- ✅ Nom du dépôt (blockhub-rules)
- ✅ URLs jsDelivr
- ✅ Hashes SHA-256 (ils sont publics dans index.json)

---

## 📋 Checklist de Sécurité

- [ ] Activer l'authentification à deux facteurs (2FA) sur GitHub
- [ ] Utiliser une clé SSH au lieu de HTTPS
- [ ] Ne jamais commiter de clés privées ou secrets
- [ ] Vérifier les commits avant de push
- [ ] Activer la protection de branche sur `main`
- [ ] Surveiller les notifications GitHub
- [ ] Garder les clés SSH dans `~/.ssh/` avec permissions 600

---

**Dernière mise à jour** : 2025-11-24  
**Version** : 1.0.0  
**Maintenu par** : Kaydin Industries

