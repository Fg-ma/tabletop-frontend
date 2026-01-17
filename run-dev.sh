concurrently \
  "npm run start --prefix ./client" \
  "npm run dev --prefix ./mediasoupServer" \
  "./nginx-1.27.3/sbin/nginx -p ./mediasoupServer/nginx -c nginx.conf" \
  "npm run dev --prefix ./userStaticContentServer" \
  "./nginx-1.27.3/sbin/nginx -p ./userStaticContentServer/nginx -c nginx.conf" \
  "npm run dev --prefix ./videoServer" \
  "./nginx-1.27.3/sbin/nginx -p ./videoServer/nginx -c nginx.conf"