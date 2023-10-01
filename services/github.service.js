"use strict";
const ConfigLoader = require("config-mixin");
const { MoleculerClientError } = require("moleculer").Errors;

/**
 * this service manages the github api and webhooks
 * 
 * webhocks used to update paas-shack deployments
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

                if (payload.registry_package) {
                    await this.processPackagePublish(ctx, payload);
                } else {

                    let action = payload.action;

                    if (!action) {
                        if (payload.forkee) {
                            action = 'forked';
                        } else if (payload.ref) {
                            action = 'pushed';
                        } else if (payload.release) {
                            action = 'released';
                        } else if (payload.pull_request) {
                            action = 'pull_request';
                        } else if (payload.issue) {
                            action = 'issue';
                        } else if (payload.pages) {
                            action = 'pages';
                        } else {
                            action = 'unknown';
                        }
                    }
                    ctx.emit(`github.actions.${action}`, payload);

                    this.logger.info(`unhandled webhook: ${action} keys: ${Object.keys(payload)}`);
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
         * process github webhook package publish
         * 
         * @param {Object} ctx - moleculer context
         * @param {Object} payload - github webhook payload
         */
        async processPackagePublish(ctx, payload) {
            const { action, repository, registry_package: pkg } = payload;
            const { name, package_version } = pkg;
            if (action === 'published') {
                this.logger.info(`package published: ${name}@${package_version.version} url: ${package_version.package_url}`);
                const Package = {
                    name,
                    namespace: pkg.namespace,
                    version: package_version.version.split(':')[1],
                    url: package_version.package_url,
                    branch: package_version.target_commitish,
                    repository: repository.full_name,
                    registry: "ghcr.io"
                };

                const url = `${Package.registry}/${Package.namespace}/${Package.name}:${Package.branch}`.toLowerCase()

                if (package_version.package_url.toLowerCase() == url) {
                    this.logger.info(`package url: ${package_version.package_url}`);
                    console.log(Package)
                    ctx.emit(`github.package.published`, Package);
                } else {
                    this.logger.info(`package url not found`);
                }
            }
        },
        /**
            * Handle different types of GitHub events and compact the payload
            * 
            * @param {string} action - The GitHub action type (e.g., pull_request, release, etc.)
            * @param {Object} payload - The GitHub webhook payload
            */
        handleGitHubEvent(action, payload) {
            let compactedPayload = {};

            if (action === 'pull_request') {
                compactedPayload = {
                    action,
                    pull_request: {
                        title: payload.pull_request.title,
                        url: payload.pull_request.url,
                        html_url: payload.pull_request.html_url,
                        state: payload.pull_request.state,
                        merged: payload.pull_request.merged,
                        draft: payload.pull_request.draft,
                        head: payload.pull_request.head,
                        base: payload.pull_request.base,
                        body: payload.pull_request.body,
                    }
                };
            } else if (action === 'release') {
                compactedPayload = {
                    action,
                    release: {
                        name: payload.release.name,
                        tag_name: payload.release.tag_name,
                        repository: payload.repository.full_name,
                        url: payload.release.url,
                        html_url: payload.release.html_url,
                        assets: payload.release.assets,
                        body: payload.release.body,
                        draft: payload.release.draft,
                    }
                };
            }
            // Add more conditions for other actions as needed...

            // Emit the compacted payload
            this.ctx.emit(`github.actions.${action}`, compactedPayload);
        }
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