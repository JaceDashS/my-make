FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY go.sum* ./
COPY *.go ./

RUN go build -o /bin/my-make-server .

FROM alpine:3.20

WORKDIR /app

COPY --from=builder /bin/my-make-server ./my-make-server

ENV PORT=8080

EXPOSE 8080

CMD ["./my-make-server"]
