FROM nginx:1.27-alpine
# CACHEBUST — skift værdi for at undgå stale layers i Dokploy-build
ARG CACHEBUST=20261018mc3
RUN echo "cachebust=$CACHEBUST"
COPY public/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN echo "cachebust=$CACHEBUST" > /usr/share/nginx/html/.build-id
EXPOSE 80
