//this file should be concatenated at the top of the legacy js files

import Chart from "chart.js";
import chartTrendline from "chartjs-plugin-trendline";
import chartAnnotation from "chartjs-plugin-annotation";

Chart.plugins.register(chartTrendline);
Chart.plugins.register(chartAnnotation);

import {
  db_getSnapshot,
  db_setSnapshot,
  db_getUserSnapshot,
  db_getUserResults,
  db_getUserHighestWpm,
  db_getLocalPB,
  db_getUserAverageWpm10,
  db_saveLocalPB,
  db_getLocalTagPB,
  db_saveLocalTagPB,
} from "./db";

import {
  showBackgroundLoader,
  hideBackgroundLoader,
  swapElements,
  accountIconLoading,
} from "./dom-util";
import * as Misc from "./misc";
import * as CloudFunctions from "./cloud-functions";
import layouts from "./layouts";
import * as Monkey from "./monkey";
import * as Notifications from "./notification-center";
import * as ResultFilters from "./result-filters";
import * as Leaderboards from "./leaderboards";
import * as Sound from "./sound";
import * as CustomText from "./custom-text";
import * as ShiftTracker from "./shift-tracker";
import * as TestStats from "./test-stats";
import * as ThemeColors from "./theme-colors";
import * as OutOfFocus from "./out-of-focus";
