#!/bin/bash
echo "🔑 Configuration SSH pour GitHub..."
echo ""
echo "Ajout de la clé SSH à l'agent..."
eval "$(ssh-agent -s)"

# Créer le fichier de config SSH si nécessaire
mkdir -p ~/.ssh
cat > ~/.ssh/config << 'SSHCONFIG'
Host github.com
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_ed25519_github
SSHCONFIG

echo ""
echo "⚠️  Vous allez devoir entrer votre passphrase SSH UNE SEULE FOIS"
echo "   (elle sera sauvegardée dans le trousseau macOS)"
echo ""

ssh-add --apple-use-keychain ~/.ssh/id_ed25519_github

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SSH configuré ! Test de connexion..."
    ssh -T git@github.com
    echo ""
    echo "✅ Prêt ! Vous pouvez maintenant exécuter: ./setup_github_sync.sh"
else
    echo ""
    echo "❌ Erreur lors de l'ajout de la clé SSH"
fi
