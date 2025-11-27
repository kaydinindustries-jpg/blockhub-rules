# 🚀 Instructions Simples pour Sync GitHub

## Option 1 : Via SSH (Recommandé mais nécessite passphrase)

### Étape 1 : Configurer SSH
```bash
cd ~/Desktop/UniBlock
./configure_ssh.sh
# Entrez votre passphrase SSH quand demandé
```

### Étape 2 : Setup initial
```bash
./setup_github_sync.sh
```

### Étape 3 : Mises à jour futures
```bash
./update_rules.sh
```

---

## Option 2 : Via Interface GitHub (Plus Simple !)

### Pour la première fois :

1. Allez sur https://github.com/kaydinindustries-jpg/blockhub-rules
2. Cliquez sur "Add file" → "Upload files"
3. Glissez-déposez ces fichiers depuis `UniBlock/rules/cdn/v1/` :
   - `kill_list.json`
   - `preserve_list.json`
   - `ai_terms.json`
   - `ai_widget_selectors.json`
   - `cookie_patterns.json`
4. Dans le dossier `utils/`, uploadez aussi `generate_index.js`
5. À la racine, uploadez `index.json`
6. Commit avec le message : "Update rules with enrichment"

### Pour les mises à jour :

1. Allez sur https://github.com/kaydinindustries-jpg/blockhub-rules
2. Naviguez vers `cdn/v1/kill_list.json`
3. Cliquez sur l'icône crayon (Edit)
4. Supprimez tout le contenu
5. Ouvrez votre fichier local `UniBlock/rules/cdn/v1/kill_list.json`
6. Copiez tout le contenu (Cmd+A, Cmd+C)
7. Collez dans GitHub (Cmd+V)
8. Scrollez en bas, commit avec message : "Update kill_list"
9. Répétez pour `preserve_list.json`

---

## Option 3 : Script Automatisé (Sans Git, juste copie locale)

Si vous voulez juste que les fichiers dans `rules/cdn/v1/` soient toujours à jour :

```bash
cd ~/Desktop/UniBlock
cp utils/kill_list.json rules/cdn/v1/kill_list.json
cp utils/preserve_list.json rules/cdn/v1/preserve_list.json
cd utils
node generate_index.js
```

Ensuite, utilisez l'Option 2 (interface GitHub) pour uploader.

---

## 🎯 Ce que je recommande MAINTENANT :

**Utilisez l'Option 2 (Interface GitHub)** car :
- ✅ Pas besoin de passphrase
- ✅ Visuel et simple
- ✅ Fonctionne immédiatement
- ✅ Pas de configuration SSH

Une fois que vous aurez fait ça, je pourrai vous aider à configurer SSH proprement pour l'avenir.

---

## ❓ Besoin d'aide ?

- **SSH ne fonctionne pas** → Utilisez l'Option 2
- **Vous voulez automatiser** → On configure SSH ensemble après
- **Vous voulez juste pousser maintenant** → Option 2 !

