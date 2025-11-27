#!/bin/bash

echo "🔄 Mise à jour des règles BlockHub sur GitHub..."
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Aller dans le dossier UniBlock
cd "/Users/aydinkerem/Desktop/UniBlock"

# Vérifier si on est dans un repo Git
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Erreur: Ce n'est pas un repo Git${NC}"
    echo -e "${YELLOW}💡 Exécutez d'abord: ./setup_github_sync.sh${NC}"
    exit 1
fi

# Étape 1: Copier les fichiers depuis utils vers rules/cdn/v1
echo -e "${YELLOW}📋 Synchronisation des fichiers locaux...${NC}"
cp utils/kill_list.json rules/cdn/v1/kill_list.json
cp utils/preserve_list.json rules/cdn/v1/preserve_list.json
echo -e "${GREEN}✓ Fichiers synchronisés${NC}"

# Étape 2: Régénérer l'index avec les nouveaux hashes
echo -e "${YELLOW}🔐 Génération des hash SHA-256...${NC}"
cd utils
node generate_index.js
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors de la génération de l'index${NC}"
    exit 1
fi
cd ..
echo -e "${GREEN}✓ Index mis à jour${NC}"

# Étape 3: Vérifier les changements
echo ""
echo -e "${BLUE}📊 Changements détectés:${NC}"
git status --short

# Étape 4: Ajouter tous les fichiers modifiés
echo ""
echo -e "${YELLOW}➕ Ajout des fichiers modifiés...${NC}"
git add rules/cdn/v1/*.json
git add index.json

# Étape 5: Créer un commit avec timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo -e "${YELLOW}💾 Création du commit...${NC}"
git commit -m "Update rules - $TIMESTAMP

Automated update of kill_list and preserve_list with latest entries."

# Étape 6: Push vers GitHub
echo ""
echo -e "${YELLOW}🚀 Push vers GitHub...${NC}"
echo -e "${RED}⚠️  Vous allez devoir entrer votre passphrase SSH${NC}"
echo ""

git push origin main

# Vérification
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ SUCCÈS ! Règles mises à jour sur GitHub !${NC}"
    echo ""
    echo -e "${BLUE}🔗 Vérifiez sur: https://github.com/kaydinindustries-jpg/blockhub-rules${NC}"
    echo ""
    echo -e "${GREEN}📡 Les utilisateurs recevront les mises à jour automatiquement via jsDelivr CDN${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Erreur lors du push${NC}"
    echo -e "${YELLOW}💡 Vérifiez votre connexion SSH: ${BLUE}ssh -T git@github.com${NC}"
    echo ""
fi
