const execFile = require('child_process').execFile;

/**
 * Prints the extension's usage
 */
function printUsage() {
  const usage = "Converts helm's output to json format.\n"
    + 'Works for commands: install, status\n'
    + '\n'
    + 'Example usage:\n'
    + '  helm json install stable/rabbitmq\n'
    + '  helm json status my-release-name\n';
  process.stdout.write(usage);
}

/**
 * Builds a json object from a string array of resources.
 * format example:
 * @param {Array} - The resources strings as returned raw by the helm output. Item example:
 *                   '==> v1beta1/StatefulSet \n
 *                    NAME             DESIRED  CURRENT  AGE \n
 *                    fun-elk-mariadb  1        1        2s'
 */
function ConvertToJSON(resources) {
  const json = [];
  resources.forEach((element) => {
    const lines = element.split('\n');
    const parsedResources = [];
    let name;

    lines.forEach((line) => {
      if (line.startsWith('==>')) {
        name = line.substring(4).trim();
      } else if (line.startsWith('NAME') === false) {
        const trimmedLine = line.trim();
        parsedResources.push(trimmedLine.substring(0, trimmedLine.indexOf(' ')));
      }
    });

    if (name !== '') {
      json.push({
        name,
        resources: parsedResources,
      });
    }
  });
  return json;
}

/**
 * From the bulk resources string, parse each individual resource and insert
 * it to the resources array which is returned at the end.
 */
function ParseResources(resourcesStr) {
  // Sanity
  if ((!resourcesStr) || (resourcesStr.trim() === '')) {
    return [];
  }

  const resources = resourcesStr.split('==> ').reverse().map(x => `==> ${x.trim()}`);
  return resources;
}

/**
 * Extracts the resources section from the helm raw output.
 * The output of this method is one text bulk of ALL the resources
 */
function ExtractResources(helmRawOutput) {
  // Sanity
  if ((!helmRawOutput) || (helmRawOutput.trim() === '')) {
    return '';
  }

  const matches = helmRawOutput.match(/(.*RESOURCES:\s+)((.|\n)*)(\s*NOTES:.*)/);

  if (!matches || matches.length < 3) {
    return '';
  }

  return matches[2];
}

/**
 * Extracts release name from the raw output of helm
 */
function ExtractReleaseName(helmRawOutput) {
  // Sanity
  if ((!helmRawOutput) || (helmRawOutput.trim() === '')) {
    return '';
  }

  const lines = helmRawOutput.split('\n');
  const lookup = 'NAME:';
  if (lines.length === 0) {
    return '';
  }

  let result = '';
  // Iterate through the lines, look for the one starting with a specific prefix,
  // We expect exactly one release name, other wise something is wrong
  lines.forEach((line) => {
    if (line.startsWith(lookup)) {
      if (result !== '') {
        throw new Error('Parsing of release name failed');
      }

      result = line.replace(lookup, '').trim();
    }
  });

  return result;
}

/**
 * Extract the release name, all the different resources and returns the
 * data as a json object
 */
function parseResponse(data) {
  const releaseName = ExtractReleaseName(data);
  const unFormattedResources = ParseResources(ExtractResources(data));
  const structuredResources = ConvertToJSON(unFormattedResources);
  return { releaseName, resources: structuredResources };
}

function main() {
  const helmBinary = process.env.HELM_BIN;
  const args = process.argv;

  // The expected arguments are:
  // ['node', 'js file', 'command', 'chart / release name']
  if (args.length < 4) {
    printUsage();
    process.exit(0);
  }

  // remove first two items n the array (which are 'node executable.js') and
  // leave only the exec arguments.
  args.splice(0, 2);

  // Execute helm with the given arguments and parse the
  // response
  execFile(helmBinary, args, (err, stdout, stderr) => {
    if (err) {
      process.stderr.write(stderr);
    } else {
      const json = parseResponse(stdout);
      process.stdout.write(JSON.stringify(json));
    }
  });
}

main();
