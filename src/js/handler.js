// An abstract grade for "request handler" modules.  Modules that extend this grade are expected to be created
// dynamically, as outlined here:
//
// http://docs.fluidproject.org/infusion/development/SubcomponentDeclaration.html#dynamic-subcomponents-with-a-source-event
//
// Typically, a gpii.express.router module constructs one of these components per request.  Note that these
// components are not persisted.  Any data you wish to retain should be stored in variables retained by a parent
// component.
//
// This grade expects to be passed two things when it is constructed:
//
//  1. The express `request` object.
//  2. The express `response` object.
//
// The `handler.router` grade and its derivatives take care of this for you.
//
// By default this object is created with a built-in timeout, and will respond with a timeout if nothing else occurs.
// To prevent this (and to actually provide a meaningful response to the user), you are expected to define a
// `handleRequest` invoker that does the following:
//
//  1. Sends the user a response.
//  2. Fires an `afterResponseSent` event.  This prevents the timeout and destroys the component.
//
// The `sendResponse` function included with this grade takes care of both, so the simplest `handleRequest` invoker
// can be defined like this:
//
// invokers: {
//   handleRequest: {
//     func: "{that}.sendResponse",
//     args: [ 200, "I am happy to hear from you whatever you have to say." ]
//   }
// }
//
// For an example of how this can be used, check out the tests included with this package.

"use strict";
var fluid     = fluid || require("infusion");
var gpii      = fluid.registerNamespace("gpii");
fluid.registerNamespace("gpii.express.handler");

// TODO:  Convert this to use JSON Schema validation when available: https://issues.gpii.net/browse/CTR-161
gpii.express.handler.checkRequirements = function (that) {
    if (!that.options) {
        fluid.fail("Cannot instantiate a 'handler' component without the required options...");
    }

    if (!that.options.request) {
        fluid.fail("Cannot instantiate a 'handler' component without a request object...");
    }

    if (!that.options.response) {
        fluid.fail("Cannot instantiate a 'handler' component without a response object...");
    }
};

gpii.express.handler.setTimeout = function (that) {
    that.timeout = setTimeout(that.sendTimeoutResponse, that.options.timeout);
};

// When we are destroyed, we need to clear our timeout to avoid trying to perform an action on a destroyed component.
gpii.express.handler.clearTimeout = function (that) {
    if (that.timeout) {
        clearTimeout(that.timeout);
    }
};

gpii.express.handler.sendTimeoutResponse = function (that) {
    that.sendResponse("500", { ok: false, message: "Request aware component timed out before it could respond sensibly." });
};

// Convenience function (with accompanying invoker) to ensure that the `afterResponseSent` event is fired.
gpii.express.handler.sendResponse = function (that, statusCode, body) {
    if (!that.response) {
        fluid.fail("Cannot send response, I have no response object to work with...");
    }

    that.response.status(statusCode).send(body);
    that.events.afterResponseSent.fire(that);
};

fluid.defaults("gpii.express.handler", {
    gradeNames: ["fluid.component"],
    timeout:    5000, // All operations must be completed in `options.timeout` milliseconds, or we will send a timeout response and destroy ourselves.
    mergePolicy: {
        "request":  "nomerge",
        "response": "nomerge"
    },
    members: {
        "request":  "{that}.options.request",
        "response": "{that}.options.response",
        "timeout":  null
    },
    events: {
        afterResponseSent: null
    },
    listeners: {
        "onCreate.checkRequirements": {
            funcName: "gpii.express.handler.checkRequirements",
            args:     ["{that}"]
        },
        "onCreate.setTimeout": {
            funcName: "gpii.express.handler.setTimeout",
            args:     ["{that}"]
        },
        "onCreate.handleRequest": {
            func: "{that}.handleRequest"
        },
        "afterResponseSent.destroy": {
            func: "{that}.destroy"
        },
        "onDestroy.clearTimeout": {
            funcName: "gpii.express.handler.clearTimeout",
            args:     ["{that}"]
        }
    },
    invokers: {
        sendResponse: {
            funcName: "gpii.express.handler.sendResponse",
            args:     ["{that}", "{arguments}.0", "{arguments}.1"]
        },
        sendTimeoutResponse: {
            funcName: "gpii.express.handler.sendTimeoutResponse",
            args:     ["{that}"]
        },
        handleRequest: {
            funcName: "fluid.notImplemented"
        }
    }
});