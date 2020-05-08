# har2openapi

This program automatically creates API documentation via a OpenApi Spec (OAS) file by using network requests captured in 
one or more HAR files.

## Step 1 - Create HAR file(s)
There are lots of ways to create HAR files to use as input for this program. One way is to manually click your way
through a web application and capture network requests in Chrome as illustrated in this [handy guide](https://help.o2.verizonmedia.com/hc/en-us/articles/360000074523-How-to-Save-a-HAR-File-Log-in-Google-Chrome).

Another way to generate HAR files is to install [Charles Proxy](https://www.charlesproxy.com/) and then run all your
end-to-end browser tests. Charles Proxy saves its raw captures in a .chls file but you can export that to a har file as Charles Proxy 
outputs har files in a convenient json format. Generating HAR files using your end-to-end tests can save you a lot of
manual clicking!

There are many other ways to generate HAR files so go crazy. Google is your friend.

## Step 2 - Generate request/response examples
Start by copying `config.json.template` to `config.json`. Once you have a valid config.json file, run
``` bash
node index.js generate outputFilename.json inputHarFile1.json inputHarFile2.json inputHarFile3.json...
```

This command consumes one or more HAR files and outputs an OAS file. A few additional files are created for your convenience:
* `output/methodList.txt` - this file contains one line for each method/operation created
* `output/pathList.txt` - this file contains one line for each path created
* `output/outputFilename.json.yaml` - this is a YAML representation of the same OAS object output to outputFilename.json

### Iteratively edit config.json and generate OAS again

You'll probably notice that the OAS file starts out pretty noisy which is why you'll want to edit `config.json` and then rinse 
and repeat generating the OAS file again.

### Replace strings in path
In the config file, you can set your API base path and any number of search/replace commands. For each parameter in
```javascript
...
  "pathReplace": {
    "key": "value",
    "key": "value"
  }
...
```
The program executes as
```
path = path.replace(/key/g, value)
```
Why would we want to do this? I'm glad you asked. There are various answers:

* Remove query string parameters from the path. Query string parameters are detected automatically and moved to path variables in the OAS file.
* Search and replace IDs in the path. A noisy OAS file will contain one endpoint definition for `/account/1` and another endpoint definition
for `/account/2`. By adding replace strings to config.json you can collapse duplicate paths into one endpoint definition
and automatically move the path IDs into path parameters in the OAS file.

### Replace strings anywhere
In addition to path parameters, there are instances when we want to remove certain strings from anywhere in the endpoint defintion
including request examples, response examples, etc. Specifically, you may want to remove secrets like passwords, sessionIds, and other things 
you probably don't want in your OAS file. To do this, add search/replace items here:
```javascript
...
  "replace": {
    "secret": ""
  }
...
```
### Tag endpoints
Each endpoint definition (aka operation) in the OAS file can have a tag which assists renders in grouping related endpoints
together. Config.json allows you to search for text in the path and assign matches to a specific Tag.

```javascript
...
  "tags": [
    ["slides"],
    ["progress", "Task Progress"]
  ]
...
```

Using this example, if `path.includes("slides") then tag = "Slides"`. if `path.includes("progress") then tag = "Task Progress"`  

## Step 3 - Manually edit request and response examples
At this point in the process it's best to manually review the request and response examples in the generated OAS file and shorten them where necessary. For
example, if an API response returns an array of 2,000 elements, perhaps your api documentation could restrict itself to a handful of
elements instead of displaying all 2,000. These descisions need to be made on a case-by-case basis and you can 
edit the generated OAS file directly.

## Step 4 - Generate json schemas and x-code-samples
After you have manually edited your OAS file, you can generate json schemas for all request and response examples and generate 
x-code-samples by running
```bash
node index.js samples output/generated.json output/withSchema.json
```
This command consumes the (presumably edited) generated.json OAS file and outputs a new OAS file containing json schemas and x-code-samples. 
It also creates an additional file for your convenience:
* `output/withSchema.json.yaml` - this is a YAML representation of the same OAS object output to withSchema.json

## Step 5 - Merge generated paths/methods/operations into master OAS file
If this is the first time you are creating your OAS file then you will want to start editing withSchema.json and adding your own
api servers, info object, security, etc. Your edited file should be considered your master OAS file. However, in the future
you may want to re-run har2openapi against new HAR files to identify differences or detect new api endpoints that
weren't picked up previously.

When this happens, you'll want to generate a new OAS file and then carefully merge it into your master OAS file without
damaging the edits you have carefully made. To do this, run

```bash
node index.js merge input/master.json output/withSchema.json output/openapi-spec.json
```
This command consumes the generated withSchema.json OAS file with your master.json file and outputs a new OAS file with them merged. New methods/operations found
in withSchema.json will be added to master.json but nothing in master.json will be replaced. 

This program also creates an additional file for your convenience:
* `output/open-spec.json.yaml` - this is a YAML representation of the same OAS object output to open-spec.json

## History

In April, 2020 I needed to document a python REST api with 150 paths and 250 endpoints (aka methods, operations). My 
preferred approach was to create an [OpenAPI Spec 3.0.3](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md) 
file (OAS) so it could be consumed and rendered using any number of [different tools](https://openapi.tools/).

To begin creating my OAS file, I fired up [Stoplight Studio](https://stoplight.io/studio/) and began cranking
away at building endpoint definitions. After creating 5 or 10 endpoints by hand, I was already burned out. I'm just
not cut out for mind-numbing, repetitive work. Creating every request and response example by hand was massively laborious
not to mention creating json schemas for each one. I'm also very lazy. Creating endpoint documentation by hand could take years!

Besides, I had a bigger problem. The API I was documenting was poorly documented (hence my involvement) and I couldn't really rely on
it to even tell me what all the paths and supported (http) methods were. 

As I laid awake at night wondering how to escape my predicament, I thought why not run all of our [cypress](https://cypress.io) end-to-end tests, capture all the network requests with something like 
[Charles Proxy](https://www.charlesproxy.com/), and figure out a way to use the proxy output to automagically create
my OAS file for me and thus escape months of life-draining monotony?

That is how this project began.
