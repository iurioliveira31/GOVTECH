#!/bin/bash
echo "Building images locally..."
docker compose -f docker-compose.prod.yml build web api-gateway worker
echo "Saving images..."
docker save aplicativo2-web aplicativo2-api-gateway aplicativo2-worker > images.tar
echo "Transferring images..."
rsync -avz -e "ssh -i $HOME/.ssh/oracle.key -o StrictHostKeyChecking=no" images.tar ubuntu@137.131.227.255:/home/ubuntu/GOVTECH/
echo "Loading and starting on server..."
ssh -i $HOME/.ssh/oracle.key -o StrictHostKeyChecking=no ubuntu@137.131.227.255 "cd /home/ubuntu/GOVTECH && docker load < images.tar && docker compose -f docker-compose.prod.yml up -d"
echo "Done!"
