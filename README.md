# Zenao

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, [install golang](https://go.dev/doc/install) and [node + npm via nvm](https://github.com/nvm-sh/nvm).

Install gno tools if you don't have them:

```bash
git clone git@github.com:gnolang/gno.git
cd gno
make install
cd ..
```

Now, start gnodev with the admin account:

```bash
gnodev --add-account g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94=100000000000ugnot .
```

In another terminal, start the backend:

```bash
go run ./backend start
```

Optionally, generate fake data:
```bash
go run ./backend fakegen
```

In a third terminal, run the development server:

```bash
nvm use
npm i
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Edit api

First, [install buf](https://buf.build/docs/installation/).

Edit the `.proto` files, when you are done, run the codegen with

```bash
make generate
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
