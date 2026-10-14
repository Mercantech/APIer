FROM golang:1.22-alpine AS build
WORKDIR /src
RUN apk add --no-cache git ca-certificates
COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/go-api .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=build /out/go-api .
ENV PORT=8080
EXPOSE 8080
USER nobody
ENTRYPOINT ["/app/go-api"]
