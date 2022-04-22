#!/usr/bin/bash

# @TODO: refactor into zx so that string manipulation magic can dissappear

set -x # log each executed command
set -e # exit on error

calendar_meetings=$(gcalcli --cal 'nikola.maric@mimi.io#blue' agenda --details conference --tsv --military --nodeclined \
    | awk -v join_date="$(date -d '+2 minutes' +%Y-%m-%d)" \
          -v join_time="$(date -d '+2 minutes' +%H:%M)" \
          -v skip_date="$(date -d '+14 minutes' +%Y-%m-%d)" \
          -v skip_time="$(date -d '+14 minutes' +%H:%M)" \
          '{ if ($5=="video" && join_date==$1 && join_time>=$2 && skip_date==$3 && skip_time<=$4) print $0 }' \
    | cut -f6- \
    | awk '{ printf "%s😇",$1; $1=""; print $0; }' \
    | sed 's/ /🙃/g' )

if [[ $calendar_meetings == "" ]]; then exit 0; fi

# export all necessary variables for use with chromium and notify-send
DISPLAY=:0
XDG_RUNTIME_DIR="/run/user/1000"
XDG_CURRENT_DESKTOP="sway"
WAYLAND_DISPLAY="wayland-1"
SWAYSOCK="$(ls /run/user/1000/sway-ipc.1000.*.sock)"
export SWAYSOCK DISPLAY XDG_CURRENT_DESKTOP XDG_RUNTIME_DIR WAYLAND_DISPLAY

for calendar_meeting in $calendar_meetings; do
    IFS="😇" read -r url description <<< "${calendar_meeting}"
    # skip meetings already opened in chrome
    chrome-session-dump "$HOME/.config/chromium" | grep -q "$url" && continue

    if [[ !$joined ]]; then
        # launch a new DBUS because it's hard to get the currently running one with the logged in user
        eval "$(dbus-launch --sh-syntax)"
        dbus-update-activation-environment --systemd DISPLAY WAYLAND_DISPLAY SWAYSOCK XDG_CURRENT_DESKTOP
    fi

    # open the calendar meeting conference URL in chromium
    chromium "$url" &
    notify-send -t 15000 GMeet "${description//🙃/ }\n$url" &

    joined=true
done;

# if there was at least one meeting joined
if [[ $joined ]]; then
    # play some tune for 5 seconds to warn (or in case of error just sleep for 2s to give time to notice the notification)
    # and then focus the chromium window
    ((aplay "$HOME/Music/dash8 fixup cut2.wav" --duration=5 || sleep 2) && swaymsg "[app_id=\"^chromium$\"]" focus) &
fi
