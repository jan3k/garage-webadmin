# How to use a pre-release

Instructions on how to run a pre-release version

## Requirements

1. NodeJS installed: https://nodejs.org/en/download
2. A Garage (v2.2.0[^1]) cluster running with an accessible Admin API endpoint (depending on the `garage.toml` and your network configuration it may correspond to the `[admin.api_bind_addr]` key)

## Command to launch the local server

```bash
API_HOST=http://localhost:3903 npx vite preview
```

Replace `http://localhost:3903` by your own endpoint

[^1]: Getting space usage and resync informations require API endpoints not yet released. If you're feeling courageous you can [compile Garage](https://garagehq.deuxfleurs.fr/documentation/cookbook/from-source/) from the [main branch](https://git.deuxfleurs.fr/Deuxfleurs/garage/src/branch/main-v2). It will works fine on 2.2.0, just some empty data on the dashboard.