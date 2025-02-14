import Activity from "../models/activity.js";
import User from "../models/user.js";
import Screenshot from "../models/screenshot.js";
import asyncHandler from "express-async-handler";

// @desc    Add a new screenshot
// @route   POST /activity/screenshot
// @access  Private

const createScreenShot = asyncHandler(async (req, res) => {
  const {
    clientId,
    projectId,
    task,
    image,
    activityAt,
    activityId,
    performanceData,
    title,
  } = req.body;

  const screenshot = await Screenshot.create({
    employee: req.user._id,
    client: clientId,
    project: projectId,
    task,
    image,
    activityAt: activityAt,
    activityId,
    performanceData,
    title,
  });

  if (screenshot) {
    const activity = await Activity.findById(activityId);
    if (!activity) {
      res.status(404).json({ mssg: "no act found" });
    }
    activity.screenshots.push(screenshot._id.toHexString());
    await activity.save();

    res.status(201).json({
      status: "success",
      screenshot,
    });
  }
});

// @desc    Add a new activity
// @route   POST /activity
// @access  Private

const createActivity = asyncHandler(async (req, res) => {
  const {
    clientId,
    projectId,
    task,
    startTime,
    endTime,
    performanceData,
    isInternal,
  } = req.body;

  const activity = await Activity.create({
    employee: req.user._id,
    client: clientId,
    project: projectId,
    task,
    performanceData,
    startTime,
    endTime,
    isInternal,
  });

  if (activity) {
    const user = await User.findById(req.user._id);
    let actAt = new Date(startTime);
    let dd = actAt.getDate();
    let mm = actAt.getMonth() + 1;
    let yyyy = actAt.getFullYear();
    let today = dd + "/" + mm + "/" + yyyy;
    let found = false;
    for (let i = 0; i < user.days.length; i++) {
      const day = user.days[i];
      if (day.date == today) {
        found = true;
        day.activities.push(activity);
        break;
      }
    }
    if (found == false) {
      const day = {
        date: today,
        activities: [activity],
      };
      user.days.push(day);
    }
    await user.save();
    res.status(201).json({
      status: "success",
      activity,
      days: user.days,
    });
  } else {
    res.status(500);
    throw new Error("Internal server error");
  }
});
// @desc    Split a  activity
// @route   POST /activity
// @access  Private

const splitActivity = asyncHandler(async (req, res) => {
  const {
    activityId,
    clientId,
    projectId,
    task,
    // startTime,
    splitTime,
    // endTime,
    performanceData,
    isInternal,
  } = req.body;

  const intialActivity = await Activity.findById(activityId).populate(
    "screenshots"
  );
  console.log("These are intitialActivity", intialActivity);

  const intitialActivityTime = parseInt(intialActivity.startTime);
  const finalActivityTime = intialActivity.endTime;
  const screenShots = intialActivity.screenshots;
  console.log("These are screenShots", screenShots);

  const activity1 = await Activity.create({
    employee: req.user._id,
    client: clientId,
    project: projectId,
    task,
    performanceData,
    startTime: intitialActivityTime,
    endTime: splitTime,
    isInternal,
  });
  const activity2 = await Activity.create({
    employee: req.user._id,
    client: clientId,
    project: projectId,
    task,
    performanceData,
    startTime: splitTime,
    endTime: finalActivityTime,
    isInternal,
  });

  console.log("This is activity 1", activity1);
  console.log("This is activity 2", activity2);

  if (activity1) {
    const user = await User.findById(req.user._id);
    console.log(user);

    let actAt = new Date(intitialActivityTime);
    let dd = actAt.getDate();
    let mm = actAt.getMonth() + 1;
    let yyyy = actAt.getFullYear();
    let today = dd + "/" + mm + "/" + yyyy;
    console.log("Date of activity1", today);
    let found = false;
    for (let i = 0; i < user.days.length; i++) {
      const day = user.days[i];
      console.log(" for activity1", day.date, today);
      if (day.date == today) {
        found = true;
        day.activities.push(activity1);
        break;
      }
    }
    if (found == false) {
      console.log("Found False for activity1");
      const day = {
        date: today,
        activities: [activity1],
      };
      user.days.push(day);
    }
    await user.save();
  } else {
    res.status(500);
    throw new Error("Internal server error");
  }
  if (activity2) {
    const user = await User.findById(req.user._id);
    let actAt = new Date(splitTime);
    let dd = actAt.getDate();
    let mm = actAt.getMonth() + 1;
    let yyyy = actAt.getFullYear();
    let today = dd + "/" + mm + "/" + yyyy;
    let found = false;
    for (let i = 0; i < user.days.length; i++) {
      const day = user.days[i];
      console.log(" for activity2", day.date, today);

      if (day.date == today) {
        console.log("Found true for activity2", day.date, today);
        found = true;
        day.activities.push(activity2);
        break;
      }
    }
    if (found == false) {
      console.log("Found False for activity1");
      const day = {
        date: today,
        activities: [activity2],
      };
      user.days.push(day);
    }
    await user.save();
  } else {
    res.status(500);
    throw new Error("Internal server error");
  }
  screenShots.forEach((screenShot) => {
    console.log("These are Screenshots", screenShot);
    const time = parseInt(screenShot.activityAt);
    let screenShotTime = new Date(time);
    let EndTime = parseInt(activity1.endTime);
    let endTime = new Date(EndTime);
    if (screenShotTime <= endTime) {
      console.log("Inside if");
      console.log("This is time and endTime", screenShotTime, endTime);
      activity1.screenshots.push(screenShot._id);
    } else {
      console.log("Inside else");
      console.log("This is time and endTime", screenShotTime, endTime);
      activity2.screenshots.push(screenShot._id);
    }
  });
  try {
    await activity1.save();
    await activity2.save();
    await Activity.findByIdAndRemove(activityId);
  } catch (error) {
    throw new Error("Sorry DataBase is Down");
  }

  res.status(200).json({
    status: "Activity Splitted Successfully",
    // activity1,
    // activity2,
  });
});

// @desc    Update the activity
// @route   PATCH /activity/:id
// @access  Private

const updateActivity = asyncHandler(async (req, res) => {
  try {
    const activityId = req.params.id;
    const unUpdatedactivity = await Activity.findByIdAndUpdate(
      activityId,
      req.body
    );
    const activity = await Activity.findById(activityId);

    if (!unUpdatedactivity) {
      res.status(404);
      throw new Error(`No activity found ${activityId}`);
    }

    res.status(202).json({
      message: "Succesfully edited activity",
      data: activity,
    });
  } catch (error) {
    throw new Error(error);
  }
});

export { createActivity, createScreenShot, updateActivity, splitActivity };
