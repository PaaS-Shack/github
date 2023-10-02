"use strict";
const ConfigLoader = require("config-mixin");
const { MoleculerClientError } = require("moleculer").Errors;


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
        
        const tag = payload.package.package_version.container_metadata.tag.name;
        strippedPayload = {
          name: payload.repository.name.toLowerCase(),
          namespace: payload.repository.owner.login.toLowerCase(),
          branch: tag == '' ? payload.package.package_version.target_commitish : tag,
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
        };
      } else if (payload.repository) {
        const [owner, repo] = payload.repository.full_name.split('/');
        strippedPayload = {
          name: repo.toLowerCase(),
          namespace: owner.toLowerCase(),
        };
      }
      return {
        action: action,
        key: key,
        payload: strippedPayload
      };
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
        actionName = action;
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