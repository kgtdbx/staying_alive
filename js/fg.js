/**
 * The MIT License (MIT)

 Copyright (c) Dmitri Snytkine

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

/**
 * Content script
 * will be injected to all pages that were
 * requested from browser (not from ajax call)
 * Script will query background page to see if request
 * uri matches any of the rules for foreground request
 * If math then will init the countdown to showing
 * alert div
 * Alert div shows live 30 seconds countdown
 * to page reload
 * User can postpone the reload for 1 minute
 * by clicking on button in alert
 */
(function () {

    var ruleId,
        init,
        showCountdownAlert,
        stopReload,
        startCountdownToAlert,
        myInner,
        alertDiv,
        startCountdownAlert;

    /**
     * Start counting down number of seconds
     * in which to show alert with alert's own countdown timer
     *
     * @param int t number of minutes till alert
     */
    startCountdownToAlert = function (t) {
        if (!t) {
            throw new Error("value of timeout t not passed");
        }

        if (t < 30) {
            throw new Error("Muminum value of timeout is 30 seconds. Passed: " + t);
        }

        setTimeout(showCountdownAlert, t * 1000);
    }

    /**
     * Initiate live counter in the alert div
     * counting down from 29 to 0
     * then reloading page
     * This is recursive function, calling itself every second until counter is 0, then reload page
     *
     * @param int s nummer of seconds to show in alert
     *
     */
    startCountdownAlert = function updateCounter(s) {
        var seconds = (s || s === 0) ? s : 29;
        if (seconds >= 0) {
            setTimeout(function () {
                var counter = document.getElementById("session_live_reloader_countdown");
                if (counter) {
                    if (seconds < 11) {
                        counter.style.backgroundColor = "#d9534f";
                    } else {
                        counter.style.backgroundColor = "#999999";
                    }

                    counter.innerText = seconds;
                }
                updateCounter(seconds - 1);
            }, 1000);
        } else {
            if (alertDiv.style.display !== "none") {
                /**
                 * Reload page
                 */
                window.location.reload(true);
            }
        }
    }

    showCountdownAlert = function () {
        var a, counter = document.getElementById("session_live_reloader_countdown");
        document.getElementById("session_live_reloader_countdown").innerText = "30";
        a = document.getElementById("ext_session_alive_reload_rule_id");
        if (counter) {
            counter.style.backgroundColor = "#999999";
        }
        if (a) {
            a.href = chrome.extension.getURL("settings.html") + "?id=" + ruleId + "#fg_rule";
        }
        alertDiv.style.display = "block";
        startCountdownAlert();
    }

    /**
     * User clicked on Cancel button to stop reload of page
     *
     */
    stopReload = function () {
        var alertDiv, counterSpan;
        alertDiv = document.getElementById("ext_session_alive_reload_prompt");
        counterSpan = document.getElementById("session_live_reloader_countdown");
        if (alertDiv && counterSpan) {
            alertDiv.style.display = "none";
            /**
             * Re-schedule alert to reappear in 1 minute
             */
            startCountdownToAlert(60);
        }
    }

    /**
     * Setup master interval,
     * add alert div into document dom
     * initially with display "none"
     */
    init = function () {

        console.log("Initialized content script");

        alertDiv = document.createElement("div");
        alertDiv.id = "ext_session_alive_reload_prompt";
        alertDiv.style.display = "none";
        myInner = '<div><div>To Keep Your Session Active<br>page will reload in <span id="session_live_reloader_countdown">30</span> seconds';
        myInner += '<br><a id="ext_session_alive_reload_rule_id" href="' + chrome.extension.getURL("settings.html") + '" target="_rule_settings">Edit Rule</br></a>';
        myInner += '</div><div><button type="button" id="ext_session_alive_reload_cancel">Wait 1 minute</button></div></div>';

        document.body.appendChild(alertDiv);
        alertDiv.innerHTML = myInner;

        document.getElementById("ext_session_alive_reload_cancel").addEventListener("click", function () {
            stopReload();
        });

        /**
         * Use message passing to pass message
         * background script has listener defined
         * if if rule is found for the requesting url
         * an object will be returned in response
         * containing ruleId and initInterval
         */
        chrome.runtime.sendMessage({getConfig: "fgRule"}, function (response) {
            var initInterval;
            if (response && response.fgRule) {
                initInterval = parseInt(response.fgRule.reloadVal, 10);
                ruleId = response.fgRule.ruleId;
                console.log("Received ruleId: " + ruleId + " timer: " + initInterval);
                if (initInterval) {
                    /**
                     * Subtract 30 seconds
                     * that the alert will take
                     * and initiate countdown to showing Alert
                     */
                    initInterval = (initInterval * 60) - 30;
                    startCountdownToAlert(initInterval);
                }
            }
        });
    }

    init();
})();