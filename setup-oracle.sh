#!/bin/bash
set -e

echo "=========================================================="
echo " GovTech SaaS - Oracle Cloud Initial Setup Script         "
echo "=========================================================="

# 1. Update system packages
echo "--> Atualizando pacotes do sistema..."
sudo apt-get update && sudo apt-get upgrade -y

# 1.5. Create 4GB Swap File (Crucial for 1GB RAM AMD Micro instance)
echo "--> Configurando arquivo de Swap de 4GB..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "Swap de 4GB criado com sucesso!"
else
    echo "Swap já configurado."
fi

# 2. Install Docker and Docker Compose
echo "--> Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker ubuntu
    rm get-docker.sh
else
    echo "Docker já está instalado."
fi

# 3. Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "--> Criando arquivo .env padrão..."
    cat <<EOF > .env
# PostgreSQL
POSTGRES_USER=govtech_admin
POSTGRES_PASSWORD=super_secret_pg_pass_123
POSTGRES_DB=aplicativo_prod

# Redis
REDIS_PASSWORD=super_secret_redis_pass_123

# Elasticsearch
ELASTIC_PASSWORD=super_secret_es_pass_123

# API JWT
JWT_SECRET=super_secret_jwt_key_prod
EOF
    echo "ATENÇÃO: Um arquivo .env foi gerado. Altere as senhas antes de iniciar!"
fi

# 4. Elasticsearch virtual memory limits (Sysctl)
echo "--> Ajustando limites de memória virtual para o Elasticsearch..."
if grep -q "vm.max_map_count" /etc/sysctl.conf; then
    sudo sed -i 's/^.*vm.max_map_count.*$/vm.max_map_count=262144/' /etc/sysctl.conf
else
    echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
fi
sudo sysctl -p

echo "=========================================================="
echo " Configuração concluída! "
echo " "
echo " Próximos passos: "
echo " 1. Edite o arquivo .env (nano .env) e mude as senhas."
echo " 2. Reinicie sua sessão (ou digite 'newgrp docker') para aplicar as permissões do Docker."
echo " 3. Inicie os contêineres: docker compose -f docker-compose.prod.yml up -d --build"
echo " 4. Libere as portas (3000, 4000) no painel de segurança da Oracle Cloud (VCN/Security Lists)."
echo "=========================================================="
