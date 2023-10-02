# RescueTime Obsidian Plugin

View your activity logs from RescueTime in Obsidian.
![OverView](./assets/OverView.png)
![LiveDemo](./assets/LiveDemo.gif)
## Installation

### Prerequisite
- RescueTime Account and Apps in your devices [Install here](https://www.rescuetime.com/get_rescuetime)
- Obsidian Desktop Client > v 0.13.0 [Install here](https://obsidian.md/)
> [!NOTE]
> This plugin is compatible only with Obsidian desktop clients, but not with mobile.
### Install RescueTime Obsidian Plugin

![Installation](./assets/Installation.png)

1. Open the setting tab at the bottom left of your Obsidian client.
2. In "Option", lick "Community Plugins" .
3. Click "Browse", then search for "RescueTime", and install it.
4. Enable "RescueTime" plugin. 

To display the data from RescueTime in Obsidian, you need to set API token in the plugin setting - see below.
### Set API token


![Obtain API key from Rescue Time](./assets/ObtainAPIkeyFromRT.png)

1. Get API token from [API management page of RescueTime](https://www.rescuetime.com/anapi/manage). Go to "Create a new API key" with a reference label that you can type anything (say, "obsidian integration"). You don't have to change "Allow queries from: ". Click "Activate this key" and copy the key.
   
![Set API token in the plugin setting](./assets/SetAPItoken.png)

2. In the setting tab, now "Community plugins" has 'RescueTime'. Paste the copied key in "API token".
3. To test API connection, click "connect" in "API connection test".

That's it! Now you should be able to view the data from RescueTime.

## View RescueTime dashboard for today

![Right Pane](./assets/RightPane.png)

Click "Expand" icon at the top right corner to expand the right pane and find the RescueTime icon.
All graphs are based on the data today.
> [!NOTE]
> Your RescueTime clients sends data to the RescueTime server every 30 minutes for free users, and 3 minutes for pro users. Thus, you will get the data update with these intervals.

## View RescueTime data for the time period specified by you

![CodeBlock](./assets/CodeBlock.png)
![CodeBlockProcessed](./assets/CodeBlockProcessed.png)
If you type the codeblock with the following format, then it will turn into the graphs showing the data over the period defined by you.
```rescuetime
FROM YYYY-MM-DD TO YYYY-MM-DD
```
> [!NOTE]
> Currently, this code block only supports the time periods spanning less than or equal to 31 days. Also you need to specify the time range starting 92 or less days before today. Querying the period 93 or more days ago will require RescueTime Pro subscription and the developer does not have subscription...
