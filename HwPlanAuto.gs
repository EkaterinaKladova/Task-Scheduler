// calculate the amount of free time in every day
// convert free time to 45 mins slots
// add tasks via list in sheet (with checkmarks for completion) (checkbox for tasks due in morning)
// organize tasks by due date

// add tasks to days
//    start at the last due date.  place tasks on the day closest to their due date as space is available 
//      and as long as there arent >7 tasks per day
//    add asap tasks to empty slots from soonest date first, ranked by order
//    if still empty slots left, pull tasks up by looking for next closest task that will fit

// TODO
// instill emergency if too much overflow on today? (days with 0 tasks get one task)
// put tasks on 2nd day if first is > 7

var td = new Date()
td.setHours(0)
td.setMinutes(0)
td.setSeconds(0)
td.setMilliseconds(0)

const dayLength = 24 * 60 * 60 * 1000

function Task(name, slots, due = "--") {
  this.name = name
  this.slots = slots
  this.due = due // calculate morning when recording the task
}

function DayPlan(day, allSlots) {
  this.day = day
  this.allSlots = allSlots
  this.freeSlots = allSlots
  this.tasks = []
  this.addTask = function(t) {
    this.freeSlots -= t.slots
    this.tasks.push(t)
  }
  this.rmTask = function(t) {
    this.freeSlots += t.slots
    var idx = this.tasks.indexOf(t)
    this.tasks.splice(idx, 1)
  }
}

function freeTime(day) {
  // keeps track of if a time is a start or end time
  function Gate(t, io) {
    this.t = t
    this.io = io
  }

  var morning = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 8)
  var night = new Date(morning.getTime() + 14 * 60 * 60 * 1000)
  var allEvents = CalendarApp.getDefaultCalendar().getEvents(morning, night)

  // ignore all-day events
  var events = [];
  while (allEvents.length > 0) {
    var e = allEvents.pop()
    if (!e.isAllDayEvent()) {
      events.push(e)
    }
  }

  var times = []
  var busy = []

  for (var i in events) {
    times.push(new Gate(events[i].getStartTime(), "S"))
    times.push(new Gate(events[i].getEndTime(), "E"))
  }

  times.sort((a, b) => (a.t > b.t) ? 1 : -1) // sort ascending

  var taken = 0;
  var curGate = times.shift()
  var i = 0;

  while (curGate !== undefined && i < 56){
    var end = new Date(morning.getTime() + (i+1) * 15 * 60 * 1000)
    var gates = []
    // while curGate is before end, update taken
    while (curGate !== undefined && ((curGate.t <= end && curGate.io == "E") || (curGate.t < end && curGate.io == "S"))) {
      gates.push(curGate)
      curGate = times.shift()
    }

    gates.sort((a, b) => (a.io < b.io) ? 1 : -1) // sort descending (S first, E last)
    var g = gates.shift()
    while (g !== undefined && g.io == "S") {
      taken += 1
      g = gates.shift()
    }

    busy[((end.getTime() - 15 * 60 * 1000 - morning.getTime())/(15 * 60 * 1000)) | 0] = taken

    while (g !== undefined && g.io == "E") {
      taken -= 1
      g = gates.shift()
    }

    i++;
  }

  var busyCount = busy.filter((num) => num > 0).length

  var free;
  var food = 2;

  // special calc for weekends
  if (morning.getDay() >= 6 || morning.getDay() == 0) {
    free = 15 - 3 // housework 
  } else {
    free = 15 - 1 - 1  // walking time + self-care
  }

  var i = 0;
  while (i < events.length && food != 0) {
    if (events[i].getTitle().includes("#food")) {
      food = 0;
    }
    i++;
  }

  free = free - 0.25*busyCount - food

  if (free > 8) {
    return 8
  }

  return free
}

function slotConvert(hours) {
  return (hours / .75) | 0
}

function getDueTasks(sheet, range) {
  var range = sheet.getRange(range);

  var i = 1
  var result = []
  while (range.getCell(i, 2).getValue()) {
    var due;
    if (range.getCell(i, 5).getValue() == "E") {
      due = new Date(range.getCell(i, 4).getValue().getTime() - dayLength)
    } else {
      due = range.getCell(i, 4).getValue()
    }

    var taskSlots = range.getCell(i, 3).getValue() 
    if (taskSlots > 5) {
      var half1 = (taskSlots/2) | 0
      var half2 = taskSlots - half1
      result.push(new Task(range.getCell(i, 2).getValue(), half1, due))
      result.push(new Task(range.getCell(i, 2).getValue(), half2, due))
    } else {
      result.push(new Task(range.getCell(i, 2).getValue(), taskSlots, due))
    }
    
    i++;
  }
  return result
}

function getTasks(sheet, range) {
  var range = sheet.getRange(range);

  var i = 1
  var result = []
  while (range.getCell(i, 2).getValue()) {
    result.push(new Task(range.getCell(i, 2).getValue(), range.getCell(i, 3).getValue()))
    i++;
  }
  return result
}

function placeTodo(plan, todo) {
  for (var i in todo) {
    // TODO
    // keep track of how much empty space there is (new array) ???
    // if 5/6/7/8 slots big, try to find matches for splitting (min 2, max 4, no more than 2 segments)
    // if no match at all, (split evenly) and add to date before due

    var curDate = todo[i].due

    // if not enough free slots in day for task or there are more than 7 tasks in a day
    while((plan.get(curDate.toDateString()).freeSlots < todo[i].slots) || (plan.get(curDate.toDateString()).tasks.length >= 7)) {
      if (curDate.toDateString() == td.toDateString()) {
        break
      }
      curDate = new Date(curDate.getTime() - dayLength);
    }

    plan.get(curDate.toDateString()).addTask(todo[i])

  }
}

function placeNodue(plan, tasks) {
  // go through days, check if they have empty slots
  // check if any tasks fit the slot

  var days = []
  for (k of plan.keys()){
    days.push(k)
  }

  for (d of days) {
    var i = 0;
    while (plan.get(d).freeSlots > 0 && tasks[i] !== undefined) {
      if (plan.get(d).freeSlots >= tasks[i].slots && plan.get(d).tasks.length < 7) {
        plan.get(d).addTask(tasks[i])
        tasks.splice(i, 1)
      } else {
        i++;
      }
    } 
  }
}
  
function pullUp(plan) {
  // pull tasks forward to empty days
  var days = []
  for (k of plan.keys()){
    days.push(k)
  }

  // go through days, if has empty slot, try to see if next day(s) have a task that would fit the slot
  for (d in days) {
    var i = 1;
    d = parseInt(d)

    while (plan.get(days[d]).freeSlots > 0 && plan.get(days[d+i]) !== undefined) {
      plan.get(days[d+i]).tasks.sort((a, b) => (a.slots < b.slots) ? 1 : -1) // sort descending
      
      var dayTasks = Array.from(plan.get(days[d+i]).tasks)
      for (t of dayTasks) {
        if (t.slots <= plan.get(days[d]).freeSlots) {
          plan.get(days[d]).addTask(t)
          plan.get(days[d+i]).rmTask(t)
        }
      }
      i++;
    }
  }
}

function countDaysAhead (plan) {
  var ahead = 0
  for(dplan of plan.entries()) {
    if (dplan[1].tasks.length == 0) {
      ahead++;
    } else {
      return ahead;
    }
  }
  return ahead;
}

function placeTasks(plan, todo, asap, nodue) {
  placeTodo(plan, todo)
  placeNodue(plan, asap)
  // flag if asap isnt empty by the end
  if (asap.length != 0) {
    Logger.log("Not all ASAP tasks assigned")
    throw(new Error())
  }
  var daysAhead = countDaysAhead(plan)

  pullUp(plan)
  placeNodue(plan, nodue)

  return daysAhead
}

function writeDayPlan (sheet, range, dplan) {
  var range = sheet.getRange(range)
  var vals = [] // 9 x 2 array

  // add day name
  const weekday = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  vals.push([weekday[dplan.day.getDay()], ""])

  // add name and slots of task
  for (task of dplan.tasks) {
    vals.push([task.name, task.slots])
  }

  if (vals.length > 8){
    while (vals.length > 7) {
      vals.pop()
    }
    vals.push(["...", ""])
  }

  while (vals.length < 8) {
    vals.push(["", ""])
  }
  
  // add total slots in day
  vals.push(["", dplan.allSlots])
  
  range.setValues(vals)
}

function main() {
  var plan = new Map([]) // dates: DayPlans

  var ss = SpreadsheetApp.openByUrl(
    "https://docs.google.com/spreadsheets/d/1qBF69z1KWn1H6I9zdShbFw1MeddHNnjM1lT-ha_YP-g/edit");
  SpreadsheetApp.setActiveSpreadsheet(ss);
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();

  const asapRange = "F2:H"
  const nodueRange = "I2:K"
  const todoRange = "A2:E"

  // make vars
  var asap = getTasks(sheets[1], asapRange)
  var nodue = getTasks(sheets[1], nodueRange)
  var todo = getDueTasks(sheets[1], todoRange).sort((a, b) => (a.slots < b.slots) ? 1 : -1).sort((a, b) => (a.due < b.due) ? 1 : -1)

  // if due more than a month from now, move to "--" section
  while (todo[0].due > new Date(td.getTime() + 31 * dayLength)) {
    nodue.push(todo[0])
    todo.shift()
  }
  
  // get free time of days until last due date
  var untilLast = ((todo[0].due.getTime() - td.getTime()) / (dayLength) + 1)
  if (untilLast < 7) {untilLast = 7}

  // create DayPlans for the needed days
  for (var i = 0; i < untilLast; i++) {
    var curDate = new Date(td.getTime() + i * dayLength)
    plan.set(curDate.toDateString(), new DayPlan(curDate, slotConvert(freeTime(curDate))))
  }

  // assigns tasks to days and counts how many days ahead I am
  var daysAhead = placeTasks(plan, todo, asap, nodue)

  for(x of plan.entries()) {
    Logger.log(x)
  }

  var week = []
  var i = 0;
  for (day of plan.entries()) {
    if (i < 7) {
      week.push(day)
      i++;
    }
  }

  // writes how many days ahead I am
  var aheadRange = sheets[0].getRange("B12")
  aheadRange.setValue(daysAhead)

  // go through 7 days in plan and put their tasks into the respective spaces in the spreadsheet
  var i = 0;
  var ranges = ["B1:C9", "D1:E9", "F1:G9", "H1:I9", "J1:K9", "L1:M9", "N1:O9"]
  for (day of week) {
    // array of ranges
    writeDayPlan(sheets[0], ranges[i], day[1])
    i++;
  }

}

// subtasks?
