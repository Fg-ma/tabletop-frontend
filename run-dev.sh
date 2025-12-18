concurrently \
  "npm run start --prefix ./client" \
  "./nginx-1.27.3/sbin/nginx -p ./nginxAssetsServer -c nginx.conf" \
  "npm run dev --prefix ./mediasoupServer" \
  "./nginx-1.27.3/sbin/nginx -p ./mediasoupServer/nginx -c nginx.conf" \
  "npm run dev --prefix ./tableStaticContentServer" \
  "./nginx-1.27.3/sbin/nginx -p ./tableStaticContentServer/nginx -c nginx.conf" \
  "npm run dev --prefix ./userStaticContentServer" \
  "./nginx-1.27.3/sbin/nginx -p ./userStaticContentServer/nginx -c nginx.conf" \
  "npm run dev --prefix ./liveTextEditingServer" \
  "./nginx-1.27.3/sbin/nginx -p ./liveTextEditingServer/nginx -c nginx.conf" \
  "npm run dev --prefix ./videoServer" \
  "./nginx-1.27.3/sbin/nginx -p ./videoServer/nginx -c nginx.conf" \
  "npm run dev --prefix ./cephServer" \
  "npm run dev --prefix ./redisServer" \
  "npm run dev --prefix ./elasticSearchServer" \
  "npm run dev --prefix ./qdrantServer"