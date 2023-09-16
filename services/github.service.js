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
        ConfigLoader(['github.**']),
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
                    this.logger.info(`unhandled webhook: ${payload.action} keys: ${Object.keys(payload)}`);
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
                    version: package_version.version,
                    url: package_version.package_url,
                    branch: package_version.target_commitish,
                    repository: repository.full_name,
                    registry: "ghcr.io"
                }

                if (package_version.package_url == `${Package.registry}/${Package.namespace}/${Package.name}:${Package.branch}`) {

                    this.logger.info(`package url: ${package_version.package_url}`);
                    console.log(Package)
                    ctx.emit(`github.package.published`, Package);
                } else {
                    this.logger.info(`package url not found`);

                }
            }
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