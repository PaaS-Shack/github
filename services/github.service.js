"use strict";
const ConfigLoader = require("config-mixin");
const { MoleculerClientError } = require("moleculer").Errors;

function isBuffer(obj) {
  return obj &&
    obj.constructor &&
    (typeof obj.constructor.isBuffer === 'function') &&
    obj.constructor.isBuffer(obj)
}

function keyIdentity(key) {
  return key
}

function flatten(target, opts) {
  opts = opts || {}

  const delimiter = opts.delimiter || '.'
  const maxDepth = opts.maxDepth
  const transformKey = opts.transformKey || keyIdentity
  const output = {}

  function step(object, prev, currentDepth) {
    currentDepth = currentDepth || 1
    Object.keys(object).forEach(function (key) {
      const value = object[key]
      const isarray = opts.safe && Array.isArray(value)
      const type = Object.prototype.toString.call(value)
      const isbuffer = isBuffer(value)
      const isobject = (
        type === '[object Object]' ||
        type === '[object Array]'
      )

      const newKey = prev
        ? prev + delimiter + transformKey(key)
        : transformKey(key)

      if (!isarray && !isbuffer && isobject && Object.keys(value).length &&
        (!opts.maxDepth || currentDepth < maxDepth)) {
        return step(value, newKey, currentDepth + 1)
      }

      output[newKey] = value
    })
  }

  step(target)

  return output
}

function unflatten(target, opts) {
  opts = opts || {}

  const delimiter = opts.delimiter || '.'
  const overwrite = opts.overwrite || false
  const transformKey = opts.transformKey || keyIdentity
  const result = {}

  const isbuffer = isBuffer(target)
  if (isbuffer || Object.prototype.toString.call(target) !== '[object Object]') {
    return target
  }

  // safely ensure that the key is
  // an integer.
  function getkey(key) {
    const parsedKey = Number(key)

    return (
      isNaN(parsedKey) ||
      key.indexOf('.') !== -1 ||
      opts.object
    )
      ? key
      : parsedKey
  }

  function addKeys(keyPrefix, recipient, target) {
    return Object.keys(target).reduce(function (result, key) {
      result[keyPrefix + delimiter + key] = target[key]

      return result
    }, recipient)
  }

  function isEmpty(val) {
    const type = Object.prototype.toString.call(val)
    const isArray = type === '[object Array]'
    const isObject = type === '[object Object]'

    if (!val) {
      return true
    } else if (isArray) {
      return !val.length
    } else if (isObject) {
      return !Object.keys(val).length
    }
  }

  target = Object.keys(target).reduce(function (result, key) {
    const type = Object.prototype.toString.call(target[key])
    const isObject = (type === '[object Object]' || type === '[object Array]')
    if (!isObject || isEmpty(target[key])) {
      result[key] = target[key]
      return result
    } else {
      return addKeys(
        key,
        result,
        flatten(target[key], opts)
      )
    }
  }, {})

  Object.keys(target).forEach(function (key) {
    const split = key.split(delimiter).map(transformKey)
    let key1 = getkey(split.shift())
    let key2 = getkey(split[0])
    let recipient = result

    while (key2 !== undefined) {
      if (key1 === '__proto__') {
        return
      }

      const type = Object.prototype.toString.call(recipient[key1])
      const isobject = (
        type === '[object Object]' ||
        type === '[object Array]'
      )

      // do not write over falsey, non-undefined values if overwrite is false
      if (!overwrite && !isobject && typeof recipient[key1] !== 'undefined') {
        return
      }

      if ((overwrite && !isobject) || (!overwrite && recipient[key1] == null)) {
        recipient[key1] = (
          typeof key2 === 'number' &&
            !opts.object
            ? []
            : {}
        )
      }

      recipient = recipient[key1]
      if (split.length > 0) {
        key1 = getkey(split.shift())
        key2 = getkey(split[0])
      }
    }

    // unflatten again for 'messy objects'
    recipient[key1] = unflatten(target[key], opts)
  })

  return result
}

/**
 * this service manages the github api and webhooks
 * 
 * webhocks used to update paas-shack deployments
 *  deployment_status,deployment,check_run,workflow,workflow_run,action,repository,organization,sender
 */
module.exports = {
  name: "github",
  version: 1,

  mixins: [
    ConfigLoader([
      'github.**'
    ]),
  ],

  /**
   * Service dependencies
   */
  dependencies: [

  ],

  /**
   * Service settings
   */
  settings: {
    rest: "v1/github",

    config: {

    }
  },

  /**
   * Actions
   */

  actions: {
    /**
     * github webhook
     * 
     * @actions
     * @param {Object} data - github webhook data
     * 
     * @returns {Object} github webhook data
     */
    webhook: {
      rest: "POST /webhook",
      permissions: ['github.webhook'],
      params: {},
      async handler(ctx) {
        const payload = ctx.params;

        // payload events
        const event = this.compactPayload(payload);

        if (event.payload == false) {
          this.logger.info(`not found github.${event.key}.${event.action}`, event.payload);
          return;
        }

        ctx.emit(`github.${event.key}.${event.action}`, event.payload);
        this.logger.info(`github.${event.key}.${event.action}`);

      }
    },
  },

  /**
   * Events
   */
  events: {
    /**
     * github.package.published
     */
    'github.package.published'(payload) {
      this.logger.info('github.package.published', payload);
    },
  },

  /**
   * Methods
   */
  methods: {


    /**
     * payload to events
     * 
     * @param {Object} payload - github webhook payload
     * 
     * @returns {Array} github action events
     */
    compactPayload(payload) {
      const events = [];

      const keys = Object.keys(payload);

      const action = this.getActionName(payload);

      const key = this.getEventKey(payload, action);

      let strippedPayload = false;

      if (key == 'package') {
        strippedPayload = {
          name: payload.repository.name.toLowerCase(),
          namespace: payload.repository.owner.name.toLowerCase(),
          branch: payload.package.package_version.target_commitish,
          sha256: payload.package.package_version.version.split(':').pop(),
          url: payload.package.package_version.package_url,
        };
      } else if (key == 'commit') {
        strippedPayload = {
          name: payload.repository.name.toLowerCase(),
          namespace: payload.repository.owner.name.toLowerCase(),
          branch: payload.ref.split('/').pop(),
          ref: payload.ref,
          commits: payload.commits,
          head: payload.head_commit
        }
      }

      return {
        action: action,
        key: key,
        payload: strippedPayload
      };
    },

    /**
     * deep walk payload adn strip any keys that include "_url"
     * 
     * @param {Object} payload - github webhook payload
     * 
     * @returns {Object} stripped payload
     */
    stripUrls(payload = {}) {
      const strippedPayload = {};

      const flattened = flatten(payload);

      const keys = Object.keys(flattened);

      keys.forEach(key => {
        if (!key.includes('_url')) {
          strippedPayload[key] = flattened[key];
        }
      });

      return unflatten(strippedPayload);
    },


    /**
     * get event key
     * 
     * @param {Object} payload - github webhook payload
     * @param {String} action - github webhook action
     * 
     * @return {String} event key
     */
    getEventKey(payload, action) {

      const keys = Object.keys(payload);
      if (keys[0] == 'action') {
        keys.shift();
      }

      let key = keys[0];

      if (key == 'ref') {
        key = 'commit';
      }

      return key;
    },

    /**
     * get action name
     * 
     * @param {Object} payload - github webhook payload
     * 
     * @returns {String} action name
     */
    getActionName(payload) {
      const action = payload.action;
      let actionName = '';

      if (!action) {
        actionName = 'unknown';
      } else {
        actionName = action
      }

      if (actionName == 'unknown') {
        const payloadKeys = Object.keys(payload);
        if (payloadKeys.length > 0) {
          actionName = payloadKeys[0];
          if (actionName == 'ref') {
            actionName = 'push';
          }
        }
      }

      return actionName;

    },
  },

  /**
   * Service created lifecycle event handler
   */
  created() { },

  /**
   * Service started lifecycle event handler
   */


  /**
   * Service stopped lifecycle event handler
   */
  stopped() { }
};