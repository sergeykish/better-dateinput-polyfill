(function(DOM, BASE_CLASS, VK_SPACE, VK_TAB, VK_ENTER, VK_ESCAPE, VK_BACKSPACE, VK_DELETE, DateUtils, testDateInput) {
    "use strict";

    var ampm = (pos, neg) => DOM.get("lang") === "en-US" ? pos : neg,
        formatISODate = (value) => value.toISOString().split("T")[0],
        PICKER_HTML  = '<div class="btr-dateinput-calendar"><p class="btr-dateinput-calendar-header"><a unselectable="on"></a><a unselectable="on"></a><span aria-hidden="true" unselectable="on" class="btr-dateinput-calendar-caption"></span></p><table aria-hidden="true" class="btr-dateinput-calendar-days"><thead><tr><th unselectable="on"></th><th unselectable="on"></th><th unselectable="on"></th><th unselectable="on"></th><th unselectable="on"></th><th unselectable="on"></th><th unselectable="on"></th></tr></thead><tbody class="btr-dateinput-calendar-body"><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr></tbody><tbody class="btr-dateinput-calendar-body"><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr></tbody></table></div>',
        LABEL_HTML = '<span aria-hidden="true" class="btr-dateinput-value"></span>',
        readDateRange = (el) => ["min", "max"].map((x) => new Date(el.get(x) || "")),
        pad = (num, maxlen) => ((maxlen === 2 ? "0" : "00") + num).slice(-maxlen);

    // need to skip mobile/tablet browsers
    DOM.extend("input[type=date]", testDateInput, {
        constructor() {
            var range = document.createRange()
            range.selectNode(this[0])

            var PICKER_FRAGMENT = range.createContextualFragment(PICKER_HTML),
                LABEL_FRAGMENT = range.createContextualFragment(LABEL_HTML),
                calendar = DOM.constructor(PICKER_FRAGMENT.firstElementChild),
                label = DOM.constructor(LABEL_FRAGMENT.firstElementChild),
                color = this.css("color");

            this
                // hide original input text
                // IE8 doesn't suport color:transparent - use background-color instead
                .css("color", document.addEventListener ? "transparent" : this.css("background-color"))
                // handle arrow keys, esc etc.
                .on("keydown", ["which", "shiftKey"], this._keydownCalendar.bind(this, calendar))
                // sync picker visibility on focus/blur
                .on(["focus", "click"], this._focusCalendar.bind(this, calendar))
                .on("blur", this._blurCalendar.bind(this, calendar))
                .on("change", this._formatValue.bind(this, label))
                .before(calendar.hide(), label);

            label
                .on("click", () => { this.fire("focus") })
                // copy input CSS to adjust visible text position
                .css(this.css(["width", "font", "padding-left", "padding-right", "text-align", "border-width", "box-sizing"]));

            var calenderDays = calendar.findAll(`.${BASE_CLASS}-calendar-body`),
                calendarCaption = calendar.find(`.${BASE_CLASS}-calendar-caption`),
                changeValue = this._changeValue.bind(this, calendarCaption, calenderDays, calendar);

            calenderDays[1].hide().remove();

            this.closest("form").on("reset", this._resetForm.bind(this));
            this.watch("value", changeValue);
            // trigger watchers to build the calendar
            changeValue(this.value());

            calendar.on("mousedown", ["target"], this._clickCalendar.bind(this, calendar));
            window.requestAnimationFrame(() => {
                var offset = this.offset();
                var labelOffset = label.offset();

                label.css({
                    "color": color,
                    "line-height": offset.height + "px",
                    "margin-left": offset.left - labelOffset.left,
                    "margin-top": offset.top - labelOffset.top
                });

                calendar
                    .css({
                        "margin-left": offset.left - labelOffset.left,
                        "margin-top": offset.bottom - labelOffset.top,
                        "z-index": 1 + (this.css("z-index") | 0)
                    });

                // FIXME
                // move calendar to the top when passing cross browser window bounds
                // if (DOM.get("clientHeight") < offset.bottom + calOffset.height) {
                //     calendar.css("margin-top", calOffset.top - offset.bottom - calOffset.height);
                // }

                // display calendar for autofocused elements
                if (this.matches(":focus")) this.fire("focus");
            });
        },
        _changeValue(caption, calenderDays, calendar, value, prevValue) {
            var year, month, date, iterDate;

            value = new Date(value);

            if (!value.getTime()) {
                value = new Date();
            }

            month = value.getUTCMonth();
            date = value.getUTCDate();
            year = value.getUTCFullYear();
            // update calendar caption
            caption.set(`<span><span data-l10n="_">${DateUtils.MONTHS[month]}</span></span> ${year}`);
            // update calendar content
            iterDate = new Date(Date.UTC(year, month, 0));
            // move to beginning of current month week
            iterDate.setUTCDate(iterDate.getUTCDate() - iterDate.getUTCDay() - ampm(1, 0));

            prevValue = new Date(prevValue);

            var delta = value.getUTCMonth() - prevValue.getUTCMonth() + 100 * (value.getUTCFullYear() - prevValue.getUTCFullYear());
            var currenDays = calenderDays[calendar.contains(calenderDays[0]) ? 0 : 1];
            var targetDays = delta ? calenderDays[calenderDays[0] === currenDays ? 1 : 0] : currenDays;
            var range = readDateRange(this);

            // update days
            targetDays.findAll("td").forEach((day) => {
                iterDate.setUTCDate(iterDate.getUTCDate() + 1);

                var mDiff = month - iterDate.getUTCMonth(),
                    className = `${BASE_CLASS}-calendar-`;

                if (year !== iterDate.getUTCFullYear()) mDiff *= -1;

                if (iterDate < range[0] || iterDate > range[1]) {
                    className += "out";
                } else if (mDiff > 0) {
                    className += "past";
                } else if (mDiff < 0) {
                    className += "future";
                } else if (date === iterDate.getUTCDate()) {
                    className += "today";
                } else {
                    className = "";
                }

                day.set({
                    _ts: iterDate.getTime(),
                    className: className,
                    textContent: iterDate.getUTCDate()
                });
            });

            if (delta) {
                currenDays[delta > 0 ? "after" : "before"](targetDays);
                currenDays.hide(() => { currenDays.remove() });
                targetDays.show();
            }

            // trigger event manually to notify about changes
            this.fire("change");
        },
        _formatValue(label) {
            var value = new Date(this.get()),
                formattedValue = "";

            if (value.getTime()) {
                var date = value.getUTCDate();
                var month = value.getUTCMonth();
                var year = value.getUTCFullYear();
                formattedValue = `${pad(month + 1, 2)}/${pad(date, 2)}/${year}`
            }

            // display formatted date value instead of real one
            label.value(formattedValue);
        },
        _clickCalendar(calendar, target) {
            var targetDate;

            if (target.matches("a")) {
                targetDate = new Date(this.get());

                if (!targetDate.getTime()) targetDate = new Date();

                targetDate.setUTCMonth(targetDate.getUTCMonth() + (target.next("a")[0] ? -1 : 1));
            } else if (target.matches("td")) {
                targetDate = target.get("_ts");

                if (targetDate) {
                    targetDate = new Date(targetDate);
                    calendar.hide();
                }
            }

            if (targetDate != null) {
                var range = readDateRange(this);

                if (targetDate < range[0]) {
                    targetDate = range[0];
                } else if (targetDate > range[1]) {
                    targetDate = range[1];
                }

                this.value(formatISODate(targetDate));
            }
            // prevent input from loosing focus
            return false;
        },
        _keydownCalendar(calendar, which, shiftKey) {
            var delta, currentDate;

            // ENTER key should submit form if calendar is hidden
            if (calendar.matches(":hidden") && which === VK_ENTER) return true;

            if (which === VK_SPACE) {
                calendar.toggle(); // SPACE key toggles calendar visibility
            } else if (which === VK_ESCAPE || which === VK_TAB || which === VK_ENTER) {
                calendar.hide(); // ESC, TAB or ENTER keys hide calendar
            } else if (which === VK_BACKSPACE || which === VK_DELETE) {
                this.empty(); // BACKSPACE, DELETE clear value
            } else {
                currentDate = new Date(this.get());

                if (!currentDate.getTime()) currentDate = new Date();

                if (which === 74 || which === 40) { delta = 7; }
                else if (which === 75 || which === 38) { delta = -7; }
                else if (which === 76 || which === 39) { delta = 1; }
                else if (which === 72 || which === 37) { delta = -1; }

                if (delta) {
                    if (shiftKey && (which === 40 || which === 38)) {
                        currentDate.setUTCFullYear(currentDate.getUTCFullYear() + (delta > 0 ? 1 : -1));
                    } else if (shiftKey && (which === 37 || which === 39)) {
                        currentDate.setUTCMonth(currentDate.getUTCMonth() + (delta > 0 ? 1 : -1));
                    } else {
                        currentDate.setUTCDate(currentDate.getUTCDate() + delta);
                    }

                    var range = readDateRange(this);

                    if (!(currentDate < range[0] || currentDate > range[1])) {
                        this.value(formatISODate(currentDate));
                    }
                }
            }
            // prevent default action except if it was TAB so
            // do not allow to change the value manually
            return which === VK_TAB;
        },
        _blurCalendar(calendar) {
            calendar.hide();
        },
        _focusCalendar(calendar) {
            // update calendar weekday captions
            calendar.findAll("th").forEach((el, index) => {
                el.l10n(DateUtils.DAYS[ampm(index, ++index % 7)].slice(0, 2));
            });

            calendar.show();

            // use the trick below to reset text selection on focus
            setTimeout(() => {
                var node = this[0];

                if ("selectionStart" in node) {
                    node.selectionStart = 0;
                    node.selectionEnd = 0;
                } else {
                    var inputRange = node.createTextRange();

                    inputRange.moveStart("character", 0);
                    inputRange.collapse();
                    inputRange.moveEnd("character", 0);
                    inputRange.select();
                }
            }, 0);
        },
        _resetForm() {
            this.value(this.get("defaultValue"));
        }
    });
}(window.DOM, "btr-dateinput", 32, 9, 13, 27, 8, 46, {
    DAYS: "Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(" "),
    MONTHS: "January February March April May June July August September October November December".split(" "),
}, (el) => {
    var nativeValue = el.get("_native"),
        deviceType = "orientation" in window ? "mobile" : "desktop";

    if (!nativeValue || nativeValue === deviceType) {
        // by default test if the type property is "date"
        // to determine if the device supports native control
        return el[0].type !== "date";
    } else {
        // remove native control
        el.set("type", "text");
        // force applying the polyfill
        return true;
    }
}));
