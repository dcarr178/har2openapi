const convert = require('@openapi-contrib/json-schema-to-openapi-schema');
const fs = require('fs')

const schema = {
  "$schema": "http://json-schema.org/draft-07/schema",
  "$id": "http://example.com/example.json",
  "type": "object",
  "title": "The root schema",
  "description": "The root schema comprises the entire JSON document.",
  "default": {},
  "examples": [
      {
          "body": {
              "display_settings": {},
              "id": "2049af9d9fa645edb3b595f51f9dc336",
              "query": {
                  "dimensions": [
                      {
                          "local": "v1.variables"
                      },
                      {
                          "local": "v1.subvariables"
                      },
                      {
                          "local": "v1.categories"
                      }
                  ],
                  "measures": {
                      "count": {
                          "args": [],
                          "function": "cube_count"
                      }
                  },
                  "with": {
                      "v1": {
                          "args": [
                              [
                                  {
                                      "args": [
                                          {
                                              "variable": "https://app.crunch.io/api/datasets/3b7aea07d2554426baa1f4b50342e6b0/variables/0e4674f46dcb4188adc82b7fca1f3ede/"
                                          }
                                      ],
                                      "function": "as_selected"
                                  },
                                  {
                                      "args": [
                                          {
                                              "variable": "https://app.crunch.io/api/datasets/3b7aea07d2554426baa1f4b50342e6b0/variables/e19bb384f740410a833ee361a08a21a5/"
                                          }
                                      ],
                                      "function": "as_selected"
                                  }
                              ]
                          ],
                          "function": "fuse"
                      }
                  }
              },
              "query_environment": {},
              "transform": {},
              "viz_specs": {}
          },
          "description": "Data to build a given analysis",
          "element": "shoji:entity",
          "self": "https://app.crunch.io/api/datasets/3b7aea07d2554426baa1f4b50342e6b0/decks/39e837852d1e4d22ada34fbe7cb7bb38/slides/eaf7b61a91e8481e9f5756a034f1db77/analyses/2049af9d9fa645edb3b595f51f9dc336/"
      }
  ],
  "required": [
      "body",
      "description",
      "element",
      "self"
  ],
  "properties": {
      "body": {
          "$id": "#/properties/body",
          "type": "object",
          "title": "The body schema",
          "description": "An explanation about the purpose of this instance.",
          "default": {},
          "examples": [
              {
                  "display_settings": {},
                  "id": "2049af9d9fa645edb3b595f51f9dc336",
                  "query": {
                      "dimensions": [
                          {
                              "local": "v1.variables"
                          },
                          {
                              "local": "v1.subvariables"
                          },
                          {
                              "local": "v1.categories"
                          }
                      ],
                      "measures": {
                          "count": {
                              "args": [],
                              "function": "cube_count"
                          }
                      },
                      "with": {
                          "v1": {
                              "args": [
                                  [
                                      {
                                          "args": [
                                              {
                                                  "variable": "https://app.crunch.io/api/datasets/3b7aea07d2554426baa1f4b50342e6b0/variables/0e4674f46dcb4188adc82b7fca1f3ede/"
                                              }
                                          ],
                                          "function": "as_selected"
                                      },
                                      {
                                          "args": [
                                              {
                                                  "variable": "https://app.crunch.io/api/datasets/3b7aea07d2554426baa1f4b50342e6b0/variables/e19bb384f740410a833ee361a08a21a5/"
                                              }
                                          ],
                                          "function": "as_selected"
                                      }
                                  ]
                              ],
                              "function": "fuse"
                          }
                      }
                  },
                  "query_environment": {},
                  "transform": {},
                  "viz_specs": {}
              }
          ],
          "required": [
              "display_settings",
              "id",
              "query",
              "query_environment",
              "transform",
              "viz_specs"
          ],
          "properties": {
              "display_settings": {
                  "$id": "#/properties/body/properties/display_settings",
                  "type": "object",
                  "title": "The display_settings schema",
                  "description": "An explanation about the purpose of this instance.",
                  "default": {},
                  "examples": [
                      {}
                  ],
                  "required": [],
                  "additionalProperties": true
              },
              "id": {
                  "$id": "#/properties/body/properties/id",
                  "type": "string",
                  "title": "The id schema",
                  "description": "An explanation about the purpose of this instance.",
                  "default": "",
                  "examples": [
                      "2049af9d9fa645edb3b595f51f9dc336"
                  ]
              },
              "query": {
                  "$id": "#/properties/body/properties/query",
                  "type": "object",
                  "title": "The query schema",
                  "description": "An explanation about the purpose of this instance.",
                  "default": {},
                  "examples": [
                      {
                          "dimensions": [
                              {
                                  "local": "v1.variables"
                              },
                              {
                                  "local": "v1.subvariables"
                              },
                              {
                                  "local": "v1.categories"
                              }
                          ],
                          "measures": {
                              "count": {
                                  "args": [],
                                  "function": "cube_count"
                              }
                          },
                          "with": {
                              "v1": {
                                  "args": [
                                      [
                                          {
                                              "args": [
                                                  {
                                                      "variable": "https://app.crunch.io/api/datasets/3b7aea07d2554426baa1f4b50342e6b0/variables/0e4674f46dcb4188adc82b7fca1f3ede/"
                                                  }
                                              ],
                                              "function": "as_selected"
                                          },
                                          {
                                              "args": [
                                                  {
                                                      "variable": "https://app.crunch.io/api/datasets/3b7aea07d2554426baa1f4b50342e6b0/variables/e19bb384f740410a833ee361a08a21a5/"
                                                  }
                                              ],
                                              "function": "as_selected"
                                          }
                                      ]
                                  ],
                                  "function": "fuse"
                              }
                          }
                      }
                  ],
                  "required": [
                      "dimensions",
                      "measures",
                      "with"
                  ],
                  "properties": {
                      "dimensions": {
                          "$id": "#/properties/body/properties/query/properties/dimensions",
                          "type": "array",
                          "title": "The dimensions schema",
                          "description": "An explanation about the purpose of this instance.",
                          "default": [],
                          "examples": [
                              [
                                  {
                                      "local": "v1.variables"
                                  },
                                  {
                                      "local": "v1.subvariables"
                                  }
                              ]
                          ],
                          "additionalItems": true,
                          "items": {
                              "$id": "#/properties/body/properties/query/properties/dimensions/items",
                              "anyOf": [
                                  {
                                      "$id": "#/properties/body/properties/query/properties/dimensions/items/anyOf/0",
                                      "type": "object",
                                      "title": "The first anyOf schema",
                                      "description": "An explanation about the purpose of this instance.",
                                      "default": {},
                                      "examples": [
                                          {
                                              "local": "v1.variables"
                                          }
                                      ],
                                      "required": [
                                          "local"
                                      ],
                                      "properties": {
                                          "local": {
                                              "$id": "#/properties/body/properties/query/properties/dimensions/items/anyOf/0/properties/local",
                                              "type": "string",
                                              "title": "The local schema",
                                              "description": "An explanation about the purpose of this instance.",
                                              "default": "",
                                              "examples": [
                                                  "v1.variables"
                                              ]
                                          }
                                      },
                                      "additionalProperties": true
                                  }
                              ]
                          }
                      },
                      "measures": {
                          "$id": "#/properties/body/properties/query/properties/measures",
                          "type": "object",
                          "title": "The measures schema",
                          "description": "An explanation about the purpose of this instance.",
                          "default": {},
                          "examples": [
                              {
                                  "count": {
                                      "args": [],
                                      "function": "cube_count"
                                  }
                              }
                          ],
                          "required": [
                              "count"
                          ],
                          "properties": {
                              "count": {
                                  "$id": "#/properties/body/properties/query/properties/measures/properties/count",
                                  "type": "object",
                                  "title": "The count schema",
                                  "description": "An explanation about the purpose of this instance.",
                                  "default": {},
                                  "examples": [
                                      {
                                          "args": [],
                                          "function": "cube_count"
                                      }
                                  ],
                                  "required": [
                                      "args",
                                      "function"
                                  ],
                                  "properties": {
                                      "args": {
                                          "$id": "#/properties/body/properties/query/properties/measures/properties/count/properties/args",
                                          "type": "array",
                                          "title": "The args schema",
                                          "description": "An explanation about the purpose of this instance.",
                                          "default": [],
                                          "examples": [
                                              []
                                          ],
                                          "additionalItems": true,
                                          "items": {
                                              "$id": "#/properties/body/properties/query/properties/measures/properties/count/properties/args/items"
                                          }
                                      },
                                      "function": {
                                          "$id": "#/properties/body/properties/query/properties/measures/properties/count/properties/function",
                                          "type": "string",
                                          "title": "The function schema",
                                          "description": "An explanation about the purpose of this instance.",
                                          "default": "",
                                          "examples": [
                                              "cube_count"
                                          ]
                                      }
                                  },
                                  "additionalProperties": true
                              }
                          },
                          "additionalProperties": true
                      },
                      "with": {
                          "$id": "#/properties/body/properties/query/properties/with",
                          "type": "object",
                          "title": "The with schema",
                          "description": "An explanation about the purpose of this instance.",
                          "default": {},
                          "examples": [
                              {
                                  "v1": {
                                      "args": [
                                          [
                                              {
                                                  "args": [
                                                      {
                                                          "variable": "https://app.crunch.io/api/datasets/3b7aea07d2554426baa1f4b50342e6b0/variables/0e4674f46dcb4188adc82b7fca1f3ede/"
                                                      }
                                                  ],
                                                  "function": "as_selected"
                                              },
                                              {
                                                  "args": [
                                                      {
                                                          "variable": "https://app.crunch.io/api/datasets/3b7aea07d2554426baa1f4b50342e6b0/variables/e19bb384f740410a833ee361a08a21a5/"
                                                      }
                                                  ],
                                                  "function": "as_selected"
                                              }
                                          ]
                                      ],
                                      "function": "fuse"
                                  }
                              }
                          ],
                          "required": [
                              "v1"
                          ],
                          "properties": {
                              "v1": {
                                  "$id": "#/properties/body/properties/query/properties/with/properties/v1",
                                  "type": "object",
                                  "title": "The v1 schema",
                                  "description": "An explanation about the purpose of this instance.",
                                  "default": {},
                                  "examples": [
                                      {
                                          "args": [
                                              [
                                                  {
                                                      "args": [
                                                          {
                                                              "variable": "https://app.crunch.io/api/datasets/3b7aea07d2554426baa1f4b50342e6b0/variables/0e4674f46dcb4188adc82b7fca1f3ede/"
                                                          }
                                                      ],
                                                      "function": "as_selected"
                                                  },
                                                  {
                                                      "args": [
                                                          {
                                                              "variable": "https://app.crunch.io/api/datasets/3b7aea07d2554426baa1f4b50342e6b0/variables/e19bb384f740410a833ee361a08a21a5/"
                                                          }
                                                      ],
                                                      "function": "as_selected"
                                                  }
                                              ]
                                          ],
                                          "function": "fuse"
                                      }
                                  ],
                                  "required": [
                                      "args",
                                      "function"
                                  ],
                                  "properties": {
                                      "args": {
                                          "$id": "#/properties/body/properties/query/properties/with/properties/v1/properties/args",
                                          "type": "array",
                                          "title": "The args schema",
                                          "description": "An explanation about the purpose of this instance.",
                                          "default": [],
                                          "examples": [
                                              [
                                                  [
                                                      {
                                                          "args": [
                                                              {
                                                                  "variable": "https://app.crunch.io/api/datasets/3b7aea07d2554426baa1f4b50342e6b0/variables/0e4674f46dcb4188adc82b7fca1f3ede/"
                                                              }
                                                          ],
                                                          "function": "as_selected"
                                                      },
                                                      {
                                                          "args": [
                                                              {
                                                                  "variable": "https://app.crunch.io/api/datasets/3b7aea07d2554426baa1f4b50342e6b0/variables/e19bb384f740410a833ee361a08a21a5/"
                                                              }
                                                          ],
                                                          "function": "as_selected"
                                                      }
                                                  ]
                                              ]
                                          ],
                                          "additionalItems": true,
                                          "items": {
                                              "$id": "#/properties/body/properties/query/properties/with/properties/v1/properties/args/items",
                                              "anyOf": [
                                                  {
                                                      "$id": "#/properties/body/properties/query/properties/with/properties/v1/properties/args/items/anyOf/0",
                                                      "type": "array",
                                                      "title": "The first anyOf schema",
                                                      "description": "An explanation about the purpose of this instance.",
                                                      "default": [],
                                                      "examples": [
                                                          [
                                                              {
                                                                  "args": [
                                                                      {
                                                                          "variable": "https://app.crunch.io/api/datasets/3b7aea07d2554426baa1f4b50342e6b0/variables/0e4674f46dcb4188adc82b7fca1f3ede/"
                                                                      }
                                                                  ],
                                                                  "function": "as_selected"
                                                              },
                                                              {
                                                                  "args": [
                                                                      {
                                                                          "variable": "https://app.crunch.io/api/datasets/3b7aea07d2554426baa1f4b50342e6b0/variables/e19bb384f740410a833ee361a08a21a5/"
                                                                      }
                                                                  ],
                                                                  "function": "as_selected"
                                                              }
                                                          ]
                                                      ],
                                                      "additionalItems": true,
                                                      "items": {
                                                          "$id": "#/properties/body/properties/query/properties/with/properties/v1/properties/args/items/anyOf/0/items",
                                                          "anyOf": [
                                                              {
                                                                  "$id": "#/properties/body/properties/query/properties/with/properties/v1/properties/args/items/anyOf/0/items/anyOf/0",
                                                                  "type": "object",
                                                                  "title": "The first anyOf schema",
                                                                  "description": "An explanation about the purpose of this instance.",
                                                                  "default": {},
                                                                  "examples": [
                                                                      {
                                                                          "args": [
                                                                              {
                                                                                  "variable": "https://app.crunch.io/api/datasets/3b7aea07d2554426baa1f4b50342e6b0/variables/0e4674f46dcb4188adc82b7fca1f3ede/"
                                                                              }
                                                                          ],
                                                                          "function": "as_selected"
                                                                      }
                                                                  ],
                                                                  "required": [
                                                                      "args",
                                                                      "function"
                                                                  ],
                                                                  "properties": {
                                                                      "args": {
                                                                          "$id": "#/properties/body/properties/query/properties/with/properties/v1/properties/args/items/anyOf/0/items/anyOf/0/properties/args",
                                                                          "type": "array",
                                                                          "title": "The args schema",
                                                                          "description": "An explanation about the purpose of this instance.",
                                                                          "default": [],
                                                                          "examples": [
                                                                              [
                                                                                  {
                                                                                      "variable": "https://app.crunch.io/api/datasets/3b7aea07d2554426baa1f4b50342e6b0/variables/0e4674f46dcb4188adc82b7fca1f3ede/"
                                                                                  }
                                                                              ]
                                                                          ],
                                                                          "additionalItems": true,
                                                                          "items": {
                                                                              "$id": "#/properties/body/properties/query/properties/with/properties/v1/properties/args/items/anyOf/0/items/anyOf/0/properties/args/items",
                                                                              "anyOf": [
                                                                                  {
                                                                                      "$id": "#/properties/body/properties/query/properties/with/properties/v1/properties/args/items/anyOf/0/items/anyOf/0/properties/args/items/anyOf/0",
                                                                                      "type": "object",
                                                                                      "title": "The first anyOf schema",
                                                                                      "description": "An explanation about the purpose of this instance.",
                                                                                      "default": {},
                                                                                      "examples": [
                                                                                          {
                                                                                              "variable": "https://app.crunch.io/api/datasets/3b7aea07d2554426baa1f4b50342e6b0/variables/0e4674f46dcb4188adc82b7fca1f3ede/"
                                                                                          }
                                                                                      ],
                                                                                      "required": [
                                                                                          "variable"
                                                                                      ],
                                                                                      "properties": {
                                                                                          "variable": {
                                                                                              "$id": "#/properties/body/properties/query/properties/with/properties/v1/properties/args/items/anyOf/0/items/anyOf/0/properties/args/items/anyOf/0/properties/variable",
                                                                                              "type": "string",
                                                                                              "title": "The variable schema",
                                                                                              "description": "An explanation about the purpose of this instance.",
                                                                                              "default": "",
                                                                                              "examples": [
                                                                                                  "https://app.crunch.io/api/datasets/3b7aea07d2554426baa1f4b50342e6b0/variables/0e4674f46dcb4188adc82b7fca1f3ede/"
                                                                                              ]
                                                                                          }
                                                                                      },
                                                                                      "additionalProperties": true
                                                                                  }
                                                                              ]
                                                                          }
                                                                      },
                                                                      "function": {
                                                                          "$id": "#/properties/body/properties/query/properties/with/properties/v1/properties/args/items/anyOf/0/items/anyOf/0/properties/function",
                                                                          "type": "string",
                                                                          "title": "The function schema",
                                                                          "description": "An explanation about the purpose of this instance.",
                                                                          "default": "",
                                                                          "examples": [
                                                                              "as_selected"
                                                                          ]
                                                                      }
                                                                  },
                                                                  "additionalProperties": true
                                                              }
                                                          ]
                                                      }
                                                  }
                                              ]
                                          }
                                      },
                                      "function": {
                                          "$id": "#/properties/body/properties/query/properties/with/properties/v1/properties/function",
                                          "type": "string",
                                          "title": "The function schema",
                                          "description": "An explanation about the purpose of this instance.",
                                          "default": "",
                                          "examples": [
                                              "fuse"
                                          ]
                                      }
                                  },
                                  "additionalProperties": true
                              }
                          },
                          "additionalProperties": true
                      }
                  },
                  "additionalProperties": true
              },
              "query_environment": {
                  "$id": "#/properties/body/properties/query_environment",
                  "type": "object",
                  "title": "The query_environment schema",
                  "description": "An explanation about the purpose of this instance.",
                  "default": {},
                  "examples": [
                      {}
                  ],
                  "required": [],
                  "additionalProperties": true
              },
              "transform": {
                  "$id": "#/properties/body/properties/transform",
                  "type": "object",
                  "title": "The transform schema",
                  "description": "An explanation about the purpose of this instance.",
                  "default": {},
                  "examples": [
                      {}
                  ],
                  "required": [],
                  "additionalProperties": true
              },
              "viz_specs": {
                  "$id": "#/properties/body/properties/viz_specs",
                  "type": "object",
                  "title": "The viz_specs schema",
                  "description": "An explanation about the purpose of this instance.",
                  "default": {},
                  "examples": [
                      {}
                  ],
                  "required": [],
                  "additionalProperties": true
              }
          },
          "additionalProperties": true
      },
      "description": {
          "$id": "#/properties/description",
          "type": "string",
          "title": "The description schema",
          "description": "An explanation about the purpose of this instance.",
          "default": "",
          "examples": [
              "Data to build a given analysis"
          ]
      },
      "element": {
          "$id": "#/properties/element",
          "type": "string",
          "title": "The element schema",
          "description": "An explanation about the purpose of this instance.",
          "default": "",
          "examples": [
              "shoji:entity"
          ]
      },
      "self": {
          "$id": "#/properties/self",
          "type": "string",
          "title": "The self schema",
          "description": "An explanation about the purpose of this instance.",
          "default": "",
          "examples": [
              "https://app.crunch.io/api/datasets/3b7aea07d2554426baa1f4b50342e6b0/decks/39e837852d1e4d22ada34fbe7cb7bb38/slides/eaf7b61a91e8481e9f5756a034f1db77/analyses/2049af9d9fa645edb3b595f51f9dc336/"
          ]
      }
  },
  "additionalProperties": true
}

const schema1 = {
    '$schema': 'http://json-schema.org/draft-04/schema#',
    type: ['string', 'null'],
    format: 'date-time',
}

const convertSchema = async () => {
    const convertedSchema = await convert(schema);
    fs.writeFileSync('jsonSchema2Openapi.json', JSON.stringify(convertedSchema, null, 2))
    console.log(`See jsonSchema2Openapi.json`)
}

convertSchema();
