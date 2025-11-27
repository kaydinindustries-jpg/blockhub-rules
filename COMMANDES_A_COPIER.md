# 📋 Commandes à Copier-Coller

Suivez ces étapes dans l'ordre. Copiez-collez chaque bloc de commandes dans votre Terminal.

---

## Étape 1 : Créer le Dépôt GitHub (Interface Web)

1. Ouvrez votre navigateur
2. Allez sur : **https://github.com/new**
3. Remplissez le formulaire :
   - **Repository name** : `blockhub-rules`
   - **Description** : `Rule files for BlockHub Chrome extension with SHA-256 integrity verification`
   - **Visibility** : ✅ **Public** (obligatoire)
   - **Initialize** : ✅ Cochez "Add a README file"
4. Cliquez sur **Create repository**

---

## Étape 2 : Cloner le Dépôt

```bash
cd ~/Desktop
git clone https://github.com/kaydinindustries-jpg/blockhub-rules.git
cd blockhub-rules
```

---

## Étape 3 : Copier les Fichiers

```bash
# Créer la structure de dossiers
mkdir -p cdn/v1

# Copier les fichiers de règles
cp ~/Desktop/UniBlock/rules/cdn/v1/ai_terms.json cdn/v1/
cp ~/Desktop/UniBlock/rules/cdn/v1/ai_widget_selectors.json cdn/v1/
cp ~/Desktop/UniBlock/rules/cdn/v1/cookie_patterns.json cdn/v1/
cp ~/Desktop/UniBlock/rules/cdn/v1/kill_list.json cdn/v1/
cp ~/Desktop/UniBlock/rules/cdn/v1/preserve_list.json cdn/v1/

# Copier l'index avec les hashes
cp ~/Desktop/UniBlock/index.json .

# Copier le README
cp ~/Desktop/UniBlock/GITHUB_REPO_README.md README.md
```

---

## Étape 4 : Vérifier les Fichiers

```bash
# Afficher la structure
ls -lR

# Devrait afficher :
# ./index.json
# ./README.md
# ./cdn/v1/ai_terms.json
# ./cdn/v1/ai_widget_selectors.json
# ./cdn/v1/cookie_patterns.json
# ./cdn/v1/kill_list.json
# ./cdn/v1/preserve_list.json
```

---

## Étape 5 : Commit et Push

```bash
# Ajouter tous les fichiers
git add .

# Vérifier ce qui va être commité
git status

# Commiter
git commit -m "Initial commit: rule files with SHA-256 integrity verification"

# Pousser vers GitHub
git push origin main
```

---

## Étape 6 : Attendre et Vérifier jsDelivr (5 minutes)

```bash
# Attendre 5 minutes, puis tester l'index
curl -s "https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/index.json" | head -20

# Tester un fichier de règles
curl -s "https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/cdn/v1/kill_list.json" | head -20
```

**Si vous voyez du JSON** : ✅ Parfait, continuez !  
**Si vous voyez "404"** : ⏰ Attendez encore 5 minutes et réessayez.

---

## Étape 7 : Tester l'Extension

1. Ouvrez Chrome
2. Allez dans `chrome://extensions`
3. Trouvez **BlockHub**
4. Cliquez sur le bouton **Recharger** (icône circulaire)
5. Cliquez sur **Service Worker** pour ouvrir la console
6. Vous devriez voir :

```
[BlockHub] Background service worker initialized
[BlockHub] Fetching index manifest from CDN...
[BlockHub] Index manifest fetched (version 1.0.0)
[BlockHub] Fetching killList with integrity check (hash: ba2a1ebe0135ae8f...)
[BlockHub] ✓ Integrity verified for killList
[BlockHub] Rules loaded from CDN for killList (500+ entries)
[BlockHub] ✓ Integrity verified for aiTerms
[BlockHub] Rules loaded from CDN for aiTerms (50+ entries)
...
```

**Si vous voyez les "✓ Integrity verified"** : 🎉 **TOUT FONCTIONNE !**

---

## 🔐 Optionnel : Configurer SSH (Recommandé)

### Générer une Clé SSH

```bash
# Générer la clé
ssh-keygen -t ed25519 -C "kaydin.industries@gmail.com"

# Quand demandé :
# - File : /Users/aydinkerem/.ssh/id_ed25519_github
# - Passphrase : (tapez un mot de passe fort)

# Démarrer l'agent SSH
eval "$(ssh-agent -s)"

# Ajouter la clé
ssh-add ~/.ssh/id_ed25519_github

# Copier la clé publique dans le presse-papiers
cat ~/.ssh/id_ed25519_github.pub | pbcopy
```

### Ajouter à GitHub

1. Allez sur : **https://github.com/settings/keys**
2. Cliquez sur **New SSH key**
3. Titre : `MacBook - BlockHub Rules`
4. Key type : **Authentication Key**
5. Collez la clé (Cmd+V, déjà dans le presse-papiers)
6. Cliquez sur **Add SSH key**

### Tester la Connexion

```bash
ssh -T git@github.com

# Devrait afficher :
# Hi kaydinindustries-jpg! You've successfully authenticated, but GitHub does not provide shell access.
```

### Configurer le Repo pour SSH

```bash
cd ~/Desktop/blockhub-rules
git remote set-url origin git@github.com:kaydinindustries-jpg/blockhub-rules.git

# Vérifier
git remote -v
# Devrait afficher : git@github.com:kaydinindustries-jpg/blockhub-rules.git
```

---

## 🔄 Workflow de Mise à Jour (Pour Plus Tard)

Chaque fois que vous modifiez des règles dans l'extension :

```bash
# Depuis le dossier de l'extension
cd ~/Desktop/UniBlock

# Lancer le script automatisé
./update_rules.sh

# Suivez les instructions à l'écran
# Le script va :
# 1. Copier les règles dans utils/
# 2. Régénérer index.json avec nouveaux hashes
# 3. Vous demander un message de commit
# 4. Vous demander si vous voulez push

# Ensuite, copier vers le repo GitHub
cd ~/Desktop/blockhub-rules
cp ~/Desktop/UniBlock/rules/cdn/v1/*.json cdn/v1/
cp ~/Desktop/UniBlock/index.json .
git add .
git commit -m "Update rules: [votre description]"
git push origin main
```

---

## 🚨 Dépannage

### Erreur : "Repository not found"

Vérifiez que vous avez bien créé le dépôt sur GitHub et qu'il s'appelle exactement `blockhub-rules`.

```bash
# Vérifier l'URL du remote
git remote -v
```

### Erreur : "Permission denied (publickey)"

Vous n'avez pas configuré SSH. Utilisez HTTPS à la place :

```bash
cd ~/Desktop/blockhub-rules
git remote set-url origin https://github.com/kaydinindustries-jpg/blockhub-rules.git
```

### jsDelivr Retourne 404

C'est normal les premières minutes. Attendez 5-10 minutes et réessayez.

Pour forcer la mise à jour du cache :

```bash
# Purger le cache jsDelivr
curl "https://purge.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/index.json"
```

### L'Extension Affiche "Integrity check FAILED"

C'est normal si le dépôt GitHub n'est pas encore configuré. L'extension utilisera automatiquement les fichiers locaux.

Une fois le dépôt configuré et jsDelivr à jour, rechargez l'extension :
1. `chrome://extensions`
2. Cliquez sur **Recharger** sous BlockHub

---

## ✅ Checklist Finale

- [ ] Dépôt GitHub créé (public)
- [ ] Fichiers clonés localement
- [ ] Fichiers copiés (cdn/v1/*.json + index.json + README.md)
- [ ] Commit et push effectués
- [ ] jsDelivr accessible (attendre 5 min)
- [ ] Extension rechargée
- [ ] Logs montrent "✓ Integrity verified"
- [ ] SSH configuré (optionnel)

---

## 🎉 Félicitations !

Si tous les "✓ Integrity verified" apparaissent dans les logs, votre système de sécurité est **entièrement opérationnel** !

Vos règles sont maintenant :
- ✅ Protégées par SHA-256
- ✅ Servies via CDN rapide
- ✅ Mises à jour automatiquement
- ✅ Auditables publiquement

---

**Besoin d'aide ?** Lisez `GITHUB_SETUP_GUIDE.md` ou `SECURITY_AND_UPDATES.md`

