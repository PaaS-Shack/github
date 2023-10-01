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
        const events = this.compactPayload(payload);

        // loop over events
        for (const event of events) {
          // emit event
          ctx.emit(`github.${event.key}.${event.action}`, event.payload);
          this.logger.info(`github.${event.key}.${event.action}`, event.payload);
        }
      }
    },
  },

  /**
   * Events
   */
  events: {

  },

  /**
   * Methods
   */
  methods: {
    /**
     * compact sender payload
     * 
     * @param {Object} payload - sender payload
     * 
     * @returns {Object} compacted sender payload
     */
    compactSenderPayload(payload) {
      return {
        id: payload.id,
        login: payload.login,
        node_id: payload.node_id,
        avatar_url: payload.avatar_url,
        gravatar_id: payload.gravatar_id,
        url: payload.url,
        type: payload.type,
        site_admin: payload.site_admin
      };
    },

    /**
     * compact repository payload
     * 
     * @param {Object} payload - repository payload
     * 
     * @returns {Object} compacted repository payload
     */
    compactRepositoryPayload(payload) {
      return {
        id: payload.id,
        node_id: payload.node_id,
        name: payload.name,
        full_name: payload.full_name,
        private: payload.private,
        owner: this.compactSenderPayload(payload.owner),
        description: payload.description,
        fork: payload.fork,
        url: payload.url,
        created_at: payload.created_at,
        updated_at: payload.updated_at,
        pushed_at: payload.pushed_at,
        homepage: payload.homepage,
        size: payload.size,
        stargazers_count: payload.stargazers_count,
        watchers_count: payload.watch
      };
    },

    /**
     * compact deployment payload
     * 
     * @param {Object} payload - deployment payload
     * 
     * @returns {Object} compacted deployment payload
     */
    compactDeploymentPayload(payload) {
      return {
        id: payload.id,
        node_id: payload.node_id,
        sha: payload.sha,
        ref: payload.ref,
        task: payload.task,
        payload: payload.payload,
        environment: payload.environment,
        description: payload.description,
        creator: this.compactSenderPayload(payload.creator),
        created_at: payload.created_at,
        updated_at: payload.updated_at
      };
    },

    /**
     * compact deployment status payload
     * 
     * @param {Object} payload - deployment status payload
     * 
     * @returns {Object} compacted deployment status payload
     */
    compactDeploymentStatusPayload(payload) {
      return {
        id: payload.id,
        node_id: payload.node_id,
        state: payload.state,
        creator: this.compactSenderPayload(payload.creator),
        description: payload.description,
        created_at: payload.created_at,
        updated_at: payload.updated_at,
      };
    },

    /**
     * compact check run payload
     * 
     * @param {Object} payload - check run payload
     * 
     * @returns {Object} compacted check run payload
     */
    compactCheckRunPayload(payload) {
      return {
        id: payload.id,
        node_id: payload.node_id,
        head_sha: payload.head_sha,
        external_id: payload.external_id,
        url: payload.url,
        status: payload.status,
        conclusion: payload.conclusion,
        started_at: payload.started_at,
        completed_at: payload.completed_at,
        output: payload.output,
        name: payload.name,
        check_suite: payload.check_suite,
        app: payload.app,
        pull_requests: payload.pull_requests
      };
    },

    /**
     * compact workflow payload
     * 
     * @param {Object} payload - workflow payload
     * 
     * @returns {Object} compacted workflow payload
     */
    compactWorkflowPayload(payload) {
      return {
        id: payload.id,
        node_id: payload.node_id,
        name: payload.name,
        path: payload.path,
        state: payload.state,
        created_at: payload.created_at,
        updated_at: payload.updated_at,
        url: payload.url,
        html_url: payload.html_url,
        badge_url: payload.badge_url
      };
    },

    /**
     * compact workflow run payload
     * 
     * @param {Object} payload - workflow run payload
     * 
     * @returns {Object} compacted workflow run payload
     */
    compactWorkflowRunPayload(payload) {
      return {
        id: payload.id,
        node_id: payload.node_id,
        head_branch: payload.head_branch,
        head_sha: payload.head_sha,
        run_number: payload.run_number,
        event: payload.event,
        status: payload.status,
        conclusion: payload.conclusion,
        workflow_id: payload.workflow_id,
        url: payload.url,
        pull_requests: payload.pull_requests,
        created_at: payload.created_at,
        updated_at: payload.updated_at,
        head_commit: payload.head_commit,
        repository: this.compactRepositoryPayload(payload.repository),
        head_repository: this.compactRepositoryPayload(payload.head_repository),
        sender: this.compactSenderPayload(payload.sender)
      };
    },

    /**
     * compact action payload
     * 
     * @param {Object} payload - action payload
     * 
     * @returns {Object} compacted action payload
     */
    compactActionPayload(payload) {
      return {
        id: payload.id,
        node_id: payload.node_id,
        name: payload.name,
        description: payload.description,
        identifier: payload.identifier,
        icon_url: payload.icon_url,
        created_at: payload.created_at,
        updated_at: payload.updated_at,
        permissions: payload.permissions
      };
    },

    /**
     * compact organization payload
     * 
     * @param {Object} payload - organization payload
     * 
     * @returns {Object} compacted organization payload
     */
    compactOrganizationPayload(payload) {
      return {
        id: payload.id,
        node_id: payload.node_id,
        login: payload.login,
        url: payload.url,
        description: payload.description,
        gravatar_id: payload.gravatar_id,
        name: payload.name,
        company: payload.company,
        blog: payload.blog,
        location: payload.location,
        email: payload.email,
        twitter_username: payload.twitter_username,
        is_verified: payload.is_verified,
        has_organization_projects: payload.has_organization_projects,
        has_repository_projects: payload.has_repository_projects,
        public_repos: payload.public_repos,
        public_gists: payload.public_gists,
        followers: payload.followers,
        following: payload.following,
        created_at: payload.created_at,
        updated_at: payload.updated_at,
        type: payload.type
      };
    },

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

      if (actions == 'synchronize') {
        events.push({
          key: 'pull_request',
          action: action,
          payload: payload.pull_request
        });
        return events;
      }

      // if first key is action pick second key as object
      if (keys[0] == 'action') {
        const object = keys[1];
        const objectPayload = payload[object];
        events.push({
          key: object,
          action: action,
          payload: objectPayload
        });
      } else {
        // if first key is not action pick first key as object
        const object = keys[0];
        const objectPayload = payload[object];
        events.push({
          key: object,
          action: action,
          payload: objectPayload
        });
      }

      return events;
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
        actionsName = 'unknown';
      } else {
        actionName = action
      }

      if (actionName == 'unknown') {
        const payloadKeys = Object.keys(payload);
        if (payloadKeys.length > 0) {
          actionName = payloadKeys[0];
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