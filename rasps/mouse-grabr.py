import asyncio
from evdev import InputDevice, ecodes
import glob
import random
import websockets
import socket
import json
import sys
import time
import os


DEVICES_PATH = "/dev/input/by-id"
raspName = socket.gethostname()

def normalize_device_name(device_name):
    """Convert device names to lowercase and replace spaces with underscores."""
    return device_name.lower().replace(" ", "_")

def brand_priority(device_name):
    """Assign a priority value to brands for sorting."""
    device_name = device_name.lower()
    if "lenovo" in device_name:
        return 1  # Lenovo first
    elif "dell" in device_name:
        return 2  # Dell second
    elif "hp" in device_name:
        return 4  # HP last
    else:
        return 3  # Other brands in between
    
async def simulate_mouse_events(queue, num_devices):
    """Simulate mouse events from four virtual devices."""
    simulated_devices = [f"bot-{i}_" for i in range(1, num_devices+1)]
    print(f"Simulating {len(simulated_devices)} devices...")

    async def send_device_update():
        """Periodically send device update messages with the list of simulated devices."""
        while True:
            await asyncio.sleep(10)  # Send update every 10 seconds
            await queue.put({
                "rasp": raspName,
                "event_type": "device_update",
                "connected_mice": simulated_devices,
            })

    async def generate_events(device_name):
        direction = 1  # 1 for right, -1 for left
        distance = 0  # Tracks the current distance moved in the current direction
        max_distance = 1500  # Maximum distance to move in one direction

        # while True:
        #     await asyncio.sleep(1 / 60)  # 60 Hz

        #     # Move by 10 pixels per frame in the current direction
        #     x_movement = direction * 5
        #     distance += abs(x_movement)

        #     # Reverse direction if the max distance is reached
        #     if distance >= max_distance:
        #         direction *= -1
        #         distance = 0

        #     await queue.put({
        #         "rasp": raspName,
        #         "client": f"{raspName}_{device_name}",
        #         "event_type": "motion",
        #         "x": x_movement,
        #         "y": 0,  # No vertical movement
        #         "timestamp_rasp": int(round(time.time() * 1000))
        #     })

        x_movement = 5

        await queue.put({
            "rasp": raspName,
            "client": f"{raspName}_{device_name}",
            "event_type": "motion",
            "x": x_movement,
            "y": 0,
        })


    tasks = [asyncio.create_task(generate_events(device)) for device in simulated_devices]
    device_update_task = asyncio.create_task(send_device_update())
    await asyncio.gather(*tasks, device_update_task)


async def send_to_websocket(queue, server_uri):
    """Connect to the WebSocket server and send messages."""
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
                    data = await queue.get()
                    json_data = json.dumps(data)
                    await websocket.send(json_data)

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
        normalized_name = normalize_device_name(device.name)
        unique_id = f"{raspName}_{normalized_name}"
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
        current_devices = set(glob.glob(f"{DEVICES_PATH}/*-event-mouse"))

        # Find new devices
        for device_path in current_devices - known_devices:
            print(f"New device detected: {device_path}")
            try:
                device_name = os.path.basename(device_path)
                normalized_name = normalize_device_name(device_name)
                motion_aggregator[normalized_name] = {"x": 0, "y": 0}
                task = asyncio.create_task(read_mouse_events(device_path, motion_aggregator))
                mice_tasks[normalized_name] = task
            except Exception as e:
                print(f"Error handling new device {device_path}: {e}")

        # Find removed devices
        for device_path in known_devices - current_devices:
            print(f"Device removed: {device_path}")
            normalized_name = normalize_device_name(os.path.basename(device_path))

        known_devices = current_devices

        sorted_devices = sorted([normalize_device_name(os.path.basename(d)) for d in known_devices], key=brand_priority)

        await queue.put({
            "rasp": raspName,
            "event_type": "device_update",
            "connected_mice": sorted_devices,
        })

        await asyncio.sleep(10)

async def main():
    queue = asyncio.Queue()
    server_uri = "ws://samm.local:8080"

    if len(sys.argv) > 1 and sys.argv[1] == "simulate":
        num_devices = int(sys.argv[2]) if len(sys.argv) > 2 else 4  # Default to 4 if not provided
        print(f"Running in simulation mode with {num_devices} devices.")
        mice_task = asyncio.create_task(simulate_mouse_events(queue, num_devices))
    else:
        print("Running in real device mode.")
        mice_task = asyncio.create_task(monitor_mice(queue))

    websocket_task = asyncio.create_task(send_to_websocket(queue, server_uri))
    await asyncio.gather(mice_task, websocket_task)

if __name__ == "__main__":
    asyncio.run(main())
