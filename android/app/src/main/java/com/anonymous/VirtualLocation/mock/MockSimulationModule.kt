package com.anonymous.VirtualLocation.mock

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap

class MockSimulationModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val controller = MockLocationController(reactContext)

  override fun getName() = "MockSimulation"

  @ReactMethod
  fun startSimulation(payload: ReadableMap, promise: Promise) {
    val timelineArray = payload.getArray("timeline")
    val optionsMap = payload.getMap("options")
    if (timelineArray == null || optionsMap == null) {
      promise.reject("E_PAYLOAD", "timeline/options 缺失")
      return
    }
    val entries = parseTimeline(timelineArray)
    val options = parseOptions(optionsMap)
    if (entries.isEmpty() && !options.hasTarget()) {
      promise.reject("E_TIMELINE", "无可用的时间轴或目标坐标")
      return
    }
    controller.start(entries, options)
    promise.resolve(null)
  }

  @ReactMethod
  fun stopSimulation(promise: Promise) {
    try {
      controller.stop()
      promise.resolve(null)
    } catch (error: Exception) {
      Log.e(TAG, "stopSimulation failed", error)
      promise.reject("E_STOP", error)
    }
  }

  @ReactMethod
  fun getStatus(promise: Promise) {
    val map = Arguments.createMap().apply {
      putString("state", "idle")
    }
    promise.resolve(map)
  }

  private fun parseTimeline(array: ReadableArray): List<TimelineEntry> {
    val entries = mutableListOf<TimelineEntry>()
    for (index in 0 until array.size()) {
      val item = array.getMap(index) ?: continue
      if (!item.hasKey("latitude") || !item.hasKey("longitude")) continue
      entries.add(
        TimelineEntry(
          latitude = item.getDouble("latitude"),
          longitude = item.getDouble("longitude"),
          timestampMs = item.getDouble("timestampMs").toLong(),
          speedMps = item.getDouble("speedMps"),
        ),
      )
    }
    return entries
  }

  private fun parseOptions(map: ReadableMap): SimulationOptionsPayload =
    SimulationOptionsPayload(
      targetLatitude = if (map.hasKey("targetCoordinate") && !map.isNull("targetCoordinate")) {
        map.getMap("targetCoordinate")?.getDouble("latitude")
      } else {
        null
      },
      targetLongitude = if (map.hasKey("targetCoordinate") && !map.isNull("targetCoordinate")) {
        map.getMap("targetCoordinate")?.getDouble("longitude")
      } else {
        null
      },
      wifiEnhancement = map.getBoolean("wifiEnhancement"),
      cellEnhancement = map.getBoolean("cellEnhancement"),
    )
}

private const val TAG = "MockSimulationModule"
