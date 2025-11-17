<div align="center">
  
  ![GitHub repo size](https://img.shields.io/github/repo-size/codewithsadee/organica)
  ![GitHub stars](https://img.shields.io/github/stars/codewithsadee/organica?style=social)
  ![GitHub forks](https://img.shields.io/github/forks/codewithsadee/organica?style=social)
[![Twitter Follow](https://img.shields.io/twitter/follow/codewithsadee_?style=social)](https://twitter.com/intent/follow?screen_name=codewithsadee_)
  [![YouTube Video Views](https://img.shields.io/youtube/views/sgCSEk1XsCo?style=social)](https://youtu.be/sgCSEk1XsCo)

  <br />
  <br />

  <h2 align="center">Organica - eCommerce website</h2>

  Organica is a fully responsive organic ecommerce website, <br />Responsive for all devices, build using HTML, CSS, and JavaScript.

  <a href="https://codewithsadee.github.io/organica/"><strong>➥ Live Demo</strong></a>

</div>

<br />

### Demo Screeshots

![Organica Desktop Demo](./readme-images/desktop.png "Desktop Demo")

### Prerequisites

Before you begin, ensure you have met the following requirements:

* [Git](https://git-scm.com/downloads "Download Git") must be installed on your operating system.

### Run Locally

To run **Organica** locally, run this command on your git bash:

Linux and macOS:

```bash
sudo git clone https://github.com/codewithsadee/organica.git
```

Windows:

```bash
git clone https://github.com/codewithsadee/organica.git
```

### Contact

If you want to contact with me you can reach me at [Twitter](https://www.twitter.com/codewithsadee).

### License

This project is **free to use** and does not contains any license.

## Backend API & MongoDB

This workspace includes a minimal Express API (`server.js`) and MongoDB data.

- Start the server: `npm run start` (serves static files and `/api/*`)
- Seed local MongoDB: `npm run seed:mongo`

### Use MongoDB Atlas

1) Set your Atlas connection string in environment:

On Windows PowerShell:

```powershell
$env:MONGO_URL = "mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?retryWrites=true&w=majority&appName=<app>"
```

Or update `.env` with `MONGO_URL=...` (do not commit secrets).

2) Migrate local data to Atlas (optional):

```powershell
# Local source is mongodb://localhost:27017 by default
# Set DB name if you changed it (defaults to 'organica')
$env:MONGO_LOCAL_URL = "mongodb://localhost:27017"
npm run migrate:mongo
```

3) Run the server (now using Atlas):

```powershell
npm start
# Check health
# http://localhost:3000/api/health -> { ok: true, db: "organica", products: N, categories: M }
```
