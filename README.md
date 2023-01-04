Bibliothèque components
==================

Fichiers d'assets pour la module de bibliothèque

## Installation

### Etape 1

Pour installer ajouter ces lignes dans le fichier composer.json

```json
{
  "repositories": [{
    "type": "composer",
    "url": "https://www.repo.info-plus.fr/"
  }]
}
```

```json
{
    "require": {
        "components/ippage" : "dev-master"
    }
}
```

```json
{
    "config": {
        "component-dir": "web/assets"
    }
}
```

Mettre à jour les vendors

```bash
composer update
```