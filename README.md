# helm json plugin

Formats the output of helm commands to json.

Works for commands: `install`, `status`

Example usage:

`helm json install stable/rabbitmq`

`helm json status my-release-name`

## Installation

`helm plugin install https://github.com/Microsoft/helm-json-output --version master`

## Installing the plugin locally

1. Clone the repo
2. Install the plugin pointing to the folder

```bash
helm plugin install .
```