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

async def simulate_mouse_events(queue):
    """Simulate mouse events from four virtual devices."""
    simulated_devices = [f"simulatedMouse-{i}" for i in range(1, 5)]
    print(f"Simulating {len(simulated_devices)} devices...")

    async def generate_events(device_name):
        direction = 1  # 1 for right, -1 for left
        distance = 0  # Tracks the current distance moved in the current direction
        max_distance = 3000  # Maximum distance to move in one direction

        while True:
            await asyncio.sleep(1 / 60)  # 60 Hz

            # Move by 10 pixels per frame in the current direction
            x_movement = direction * 10
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
    """Read mouse events from a specific device."""
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
        elif event.type == ecodes.EV_KEY:  # Button press or release
            await motion_aggregator['queue'].put({
                "rasp": raspName,
                "client": unique_id,
                "event_type": "button",
                "code": ecodes.BTN[event.code],
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
                "code": ecodes.REL[event.code],
                "value": direction,
                "timestamp_rasp": int(round(time.time() * 1000))
            })

async def monitor_mice(queue):
    """Monitor all connected mice under /dev/input/by-id."""
    mice_tasks = []
    motion_aggregator = {"queue": queue}
    for device_path in glob.glob(f"{DEVICES_PATH}/*-event-mouse"):
        mice_tasks.append(asyncio.create_task(read_mouse_events(device_path, motion_aggregator)))
    print(f"Monitoring {len(mice_tasks)} mice...")
    
    async def flush_motion():
        """Send aggregated motion events at a fixed rate."""
        while True:
            await asyncio.sleep(1 / 60)  # 60 Hz
            for unique_id, motion in motion_aggregator.items():
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

    mice_tasks.append(asyncio.create_task(flush_motion()))
    await asyncio.gather(*mice_tasks)


async def main():
    queue = asyncio.Queue()
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
