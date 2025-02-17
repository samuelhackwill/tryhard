import asyncio
from evdev import InputDevice, ecodes
import glob
import random
import websockets
import socket
import json
import sys
import time

DEVICES_PATH = "/dev/input/by-id"
raspName = socket.gethostname()

def brand_priority(device_name):
    """Assign a priority value to brands for sorting."""
    if "lenovo" in device_name.lower():
        return 1 # lenovo should be first
    elif "dell" in device_name.lower():
        return 2 # dell should be second
    elif "hp" in device_name.lower():
        return 4  # HP should be last
    else:
        return 3  # Other brands go between Dell and HP

async def simulate_mouse_events(queue):
    """Simulate mouse events from four virtual devices."""
    simulated_devices = [f"simulatedMouse-{i}" for i in range(1, 5)]
    print(f"Simulating {len(simulated_devices)} devices...")

    async def generate_events(device_name):
        direction = 1  # 1 for right, -1 for left
        distance = 0  # Tracks the current distance moved in the current direction
        max_distance = 1500  # Maximum distance to move in one direction

        while True:
            await asyncio.sleep(1 / 60)  # 60 Hz

            # Move by 10 pixels per frame in the current direction
            x_movement = direction * 5
            distance += abs(x_movement)

            # Reverse direction if the max distance is reached
            if distance >= max_distance:
                direction *= -1
                distance = 0

            await queue.put({
                "rasp": raspName,
                "client": f"{raspName}_{device_name}",
                "event_type": "motion",
                "x": x_movement,
                "y": 0,  # No vertical movement
                "timestamp_rasp": int(round(time.time() * 1000))
            })

    tasks = [asyncio.create_task(generate_events(device)) for device in simulated_devices]
    await asyncio.gather(*tasks)

    """Simulate mouse events from four virtual devices."""
    simulated_devices = [f"simulatedMouse-{i}" for i in range(1, 5)]
    print(f"Simulating {len(simulated_devices)} devices...")

    # async def generate_events(device_name):
    #     while True:
    #         await asyncio.sleep(1 / 20)  # 60 Hz
    #         x_movement = random.randint(-10, 10)
    #         y_movement = random.randint(-10, 10)

    #         await queue.put({
    #             "rasp": raspName,
    #             "client": f"{raspName}_{device_name}",
    #             "event_type": "motion",
    #             "x": x_movement,
    #             "y": y_movement,
    #             "timestamp_rasp": int(round(time.time() * 1000))
    #         })

    # tasks = [asyncio.create_task(generate_events(device)) for device in simulated_devices]
    # await asyncio.gather(*tasks)

async def send_to_websocket(queue, server_uri):
    """Connect to the WebSocket server and send mouse events."""
    while True:
        try:
            async with websockets.connect(
                server_uri,
                ping_interval=5,
                ping_timeout=10
            ) as websocket:
                print(f"Connected to WebSocket server at {server_uri}")

                async def handle_pings():
                    """Handle incoming ping messages."""
                    while True:
                        try:
                            await websocket.recv()
                        except websockets.ConnectionClosed:
                            print("Connection closed during ping handling.")
                            break

                asyncio.create_task(handle_pings())

                while True:
                    # queue_length = queue.qsize()  # Check queue length
                    # print(f"Queue size ({queue_length} items).")
                    # queue never grows larger than 1 

                    data = await queue.get()
                    json_data = json.dumps(data)
                    await websocket.send(json_data)
                    # print(f"Sent data to server: {json_data}")

        except websockets.ConnectionClosedError as e:
            print(f"Connection closed unexpectedly: {e}")
            await asyncio.sleep(5)
        except Exception as e:
            print(f"Unexpected error: {e}")
            await asyncio.sleep(5)

async def read_mouse_events(device_path, motion_aggregator):
    """Read mouse events from a specific device and handle disconnections."""
    try:
        device = InputDevice(device_path)
        unique_id = f"{raspName}_{device.name}"
        print(f"Listening on device: {device.name} ({device.path})")

        if unique_id not in motion_aggregator:
            motion_aggregator[unique_id] = {"x": 0, "y": 0}

        async for event in device.async_read_loop():
            if event.type == ecodes.EV_REL:
                if event.code == ecodes.REL_X:
                    motion_aggregator[unique_id]['x'] += event.value
                elif event.code == ecodes.REL_Y:
                    motion_aggregator[unique_id]['y'] += event.value
            elif event.type == ecodes.EV_KEY:
                await motion_aggregator['queue'].put({
                    "rasp": raspName,
                    "client": unique_id,
                    "event_type": "button",
                    "code": ecodes.BTN.get(event.code, "unknown"),
                    "value": "pressed" if event.value == 1 else "released",
                    "timestamp_rasp": int(round(time.time() * 1000))
                })
            elif event.type == ecodes.EV_REL and event.code in (ecodes.REL_WHEEL, ecodes.REL_HWHEEL):
                direction = "up" if event.value > 0 else "down"
                if event.code == ecodes.REL_HWHEEL:
                    direction = "right" if event.value > 0 else "left"
                await motion_aggregator['queue'].put({
                    "rasp": raspName,
                    "client": unique_id,
                    "event_type": "wheel",
                    "code": ecodes.REL.get(event.code, "unknown"),
                    "value": direction,
                    "timestamp_rasp": int(round(time.time() * 1000))
                })

    except OSError:
        print(f"Device {device_path} disconnected.")
    except Exception as e:
        print(f"Error reading device {device_path}: {e}")

async def monitor_mice(queue):
    """Continuously monitor connected mice and support hot-plugging."""
    known_devices = set()
    motion_aggregator = {"queue": queue}
    mice_tasks = {}

    async def flush_motion():
        """Send aggregated motion events at a fixed rate."""
        while True:
            await asyncio.sleep(1 / 60)  # 60 Hz
            for unique_id, motion in list(motion_aggregator.items()):
                if unique_id == "queue":  # Skip the queue key
                    continue
                if motion['x'] != 0 or motion['y'] != 0:
                    await queue.put({
                        "rasp": raspName,
                        "client": unique_id,
                        "event_type": "motion",
                        "x": motion['x'],
                        "y": motion['y'],
                        "timestamp_rasp": int(round(time.time() * 1000))
                    })
                    motion['x'] = 0
                    motion['y'] = 0

    asyncio.create_task(flush_motion())

    while True:
        # Get current list of mice
        current_devices = set(glob.glob(f"{DEVICES_PATH}/*-event-mouse"))

        # Find new devices
        for device_path in current_devices - known_devices:
            print(f"New device detected: {device_path}")
            motion_aggregator[device_path] = {"x": 0, "y": 0}
            task = asyncio.create_task(read_mouse_events(device_path, motion_aggregator))
            mice_tasks[device_path] = task

        # Find removed devices
        for device_path in known_devices - current_devices:
            print(f"Device removed: {device_path}")
            if device_path in mice_tasks:
                mice_tasks[device_path].cancel()  # Stop the task
                del mice_tasks[device_path]  # Remove from task list
                del motion_aggregator[device_path]  # Remove tracking data

        known_devices = current_devices  # Update the tracked devices

        sorted_devices = sorted(known_devices, key=brand_priority)

        await queue.put({
            "rasp": raspName,
            "event_type": "device_update",
            "connected_mice": sorted_devices,  # Sorted for consistency
            })

        await asyncio.sleep(10)  # Scan for changes every 2 seconds

async def main():
    queue = asyncio.Queue()
    # attention : ça peut merder si le serveur était connecté au SSID tryhard en wifi avant de switcher en RJ45. probablement un bail de cache dns ou quoi. Dans ce cas mettre l'ip plutôt que le domaine
    server_uri = "ws://samm.local:8080"

    if len(sys.argv) > 1 and sys.argv[1] == "simulate":
        print("Running in simulation mode.")
        mice_task = asyncio.create_task(simulate_mouse_events(queue))
    else:
        print("Running in real device mode.")
        mice_task = asyncio.create_task(monitor_mice(queue))

    websocket_task = asyncio.create_task(send_to_websocket(queue, server_uri))
    await asyncio.gather(mice_task, websocket_task)

if __name__ == "__main__":
    asyncio.run(main())
