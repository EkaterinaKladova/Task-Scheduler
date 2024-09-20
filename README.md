Having grown tired of figuring how much is reasonable for me to accomplish in a given day, as well as prioritizing the ever-changing list of tasks, I decided to automate it.*

This is a Google Apps Script that creates a schedule of what tasks I need to get done each day, taking into consideration the task due date, length of task, and my available time.  The first two are taken from inputs into the list of tasks on the spreadsheet (ToDo tab) and the last one is automatically calculated from my Google Calendar.

The process:
- Collect the three different task types from the spreadsheet: Normal (have a due date ("E" in the early slot means the task is due before midnight on that day)), ASAP (no due date but urgent), and NoDue (no due date and not urgent).
- Calculate how much free time I have in the following days (range dependson the due dates of the tasks).  This is accomplished by checking how much of my time is taken up by events in Google Calendar (as well as subtracting some time for food and personal care).  If an event name has the #food tag, the time reserved for food is lowered.  
- Convert the free time into number of ime slots available that day: this is optional, but I find it easier to estimate task length by 45 minutes rather than hours, so I call this timeframe "slots" and use it throughout this project.  It originates from me using the 40-5 pomodoro method.
- Assign the tasks to days.  First, the due date tasks are assigned to the last possible date before they are due.  Then, the ASAP tasks are assigned as early as possible.  Then the due date tasks are pulled forward as early as possible without moving the ASAP tasks.  Lastly, the "NoDue" tasks are placed where there is space.
- All else being equal, the tasks are always assigned starting with the highest length first, since this lets the "heavy" tasks take up the most free days and not run into the issue of not having a big enough slot for them.  Additionally, the big tasks (longer than 5 slots) are internally split in half so as to make planning more flexible.
- Currently, if too many tasks are due despite not having time for them, they automatically "overflow" into the first day.  The goal is to not let that happen :)
- Finally, the tasks are printed onto the spreadsheet, showing the lists for the seven upcoming days.

"Days Ahead" Calculation:\
A recent addition to motivate me to get ahead on work.  This is calculated as the number of empty days after the due date tasks are initially placed, but before they are pulled forward.  You can also think of this as the number of days for which I can do nothing before I really need to start working on things.




*This project is similar to Motion's AI Calendar Assistant, but I pinky promise I did not know they existed until after creating this script... and I refuse to believe they are actually using "AI."  Not every program is AI.  Fight me.
