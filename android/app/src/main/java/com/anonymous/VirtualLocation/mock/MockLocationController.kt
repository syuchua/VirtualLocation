package com.anonymous.VirtualLocation.mock

import android.content.Context
import android.location.Criteria
import android.location.Location
import android.location.LocationManager
import android.os.Handler
import android.os.HandlerThread
import android.os.SystemClock
import android.util.Log

data class TimelineEntry(
  val latitude: Double,
  val longitude: Double,
  val timestampMs: Long,
  val speedMps: Double,
)

data class SimulationOptionsPayload(
  val targetLatitude: Double?,
  val targetLongitude: Double?,
  val wifiEnhancement: Boolean,
  val cellEnhancement: Boolean,
) {
  fun hasTarget(): Boolean = targetLatitude != null && targetLongitude != null

  fun toTargetEntry(timestampMs: Long): TimelineEntry? {
    if (!hasTarget()) return null
    return TimelineEntry(
      latitude = targetLatitude!!,
      longitude = targetLongitude!!,
      timestampMs = timestampMs,
      speedMps = 0.0,
    )
  }
}

private data class ProviderConfig(
  val name: String,
  val accuracy: Int,
  val powerRequirement: Int,
)

class MockLocationController(context: Context) {
  private val providerConfigs =
    listOf(
      ProviderConfig(
        name = LocationManager.GPS_PROVIDER,
        accuracy = Criteria.ACCURACY_FINE,
        powerRequirement = Criteria.POWER_HIGH,
      ),
      ProviderConfig(
        name = LocationManager.NETWORK_PROVIDER,
        accuracy = Criteria.ACCURACY_COARSE,
        powerRequirement = Criteria.POWER_LOW,
      ),
      ProviderConfig(
         name = LocationManager.FUSED_PROVIDER,
         accuracy = Criteria.ACCURACY_FINE,
         powerRequirement = Criteria.POWER_LOW,
     )
    )
  private val locationManager =
    context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
  private val handlerThread = HandlerThread("MockLocationThread").apply { start() }
  private val handler = Handler(handlerThread.looper)
  private var activeTargetRepeater: Runnable? = null

  fun start(entries: List<TimelineEntry>, options: SimulationOptionsPayload) {
    val hasTimeline = entries.isNotEmpty()
    val hasTarget = options.hasTarget()
    Log.i(
      TAG,
      "start: hasTimeline=$hasTimeline, hasTarget=$hasTarget entries=${entries.size} targetLat=${options.targetLatitude} targetLon=${options.targetLongitude}",
    )
    if (!hasTimeline && !hasTarget) {
      Log.w(TAG, "Timeline empty and no target provided")
      return
    }
    ensureTestProvider()
    handler.removeCallbacksAndMessages(null)
    activeTargetRepeater = null

    if (hasTarget) {
      val targetEntry = options.toTargetEntry(System.currentTimeMillis())
      if (targetEntry != null) {
        startRepeatingTarget(targetEntry)
      }
    }

    if (hasTimeline) {
      val baseTs = entries.first().timestampMs
      val offsetMs = if (hasTarget) 1500L else 0L
      entries.forEach { entry ->
        val delay = (entry.timestampMs - baseTs).coerceAtLeast(0) + offsetMs
        Log.d(TAG, "schedule timeline entry delay=$delay entry=$entry")
        handler.postDelayed(
          {
            pushLocation(entry)
          },
          delay,
        )
      }
    }

    if (options.wifiEnhancement) {
      Log.i(TAG, "Wi-Fi enhancement requested (not yet implemented)")
    }
    if (options.cellEnhancement) {
      Log.i(TAG, "Cell enhancement requested (not yet implemented)")
    }
  }

  private fun startRepeatingTarget(targetEntry: TimelineEntry) {
    val startRealtime = SystemClock.elapsedRealtime()
    val repeater =
      object : Runnable {
        override fun run() {
          val updatedEntry = targetEntry.copy(timestampMs = System.currentTimeMillis())
          Log.d(TAG, "repeat target entry -> $updatedEntry")
          pushLocation(updatedEntry)
          val elapsed = SystemClock.elapsedRealtime() - startRealtime
          if (elapsed < TARGET_PUSH_DURATION_MS) {
            handler.postDelayed(this, TARGET_PUSH_INTERVAL_MS)
          } else {
            activeTargetRepeater = null
          }
        }
      }
    activeTargetRepeater?.let { handler.removeCallbacks(it) }
    activeTargetRepeater = repeater
    handler.post(repeater)
  }

  private fun ensureTestProvider() {
    providerConfigs.forEach { config ->
      try {
        try {
          locationManager.removeTestProvider(config.name)
        } catch (_: Exception) {
          // Provider might not exist or not be a test provider yet.
        }
        locationManager.addTestProvider(
          config.name,
          /* requiresNetwork = */ false,
          /* requiresSatellite = */ false,
          /* requiresCell = */ false,
          /* hasMonetaryCost = */ false,
          /* supportsAltitude = */ true,
          /* supportsSpeed = */ true,
          /* supportsBearing = */ true,
          config.powerRequirement,
          config.accuracy,
        )
        locationManager.setTestProviderEnabled(config.name, true)
        Log.d(TAG, "Test provider ready: ${config.name}")
      } catch (error: SecurityException) {
        Log.e(
          TAG,
          "Failed to enable test provider ${config.name}. Ensure app is set as mock location app.",
          error,
        )
      } catch (error: IllegalArgumentException) {
        Log.e(TAG, "Failed to register test provider ${config.name}", error)
      }
    }
  }

  private fun pushLocation(entry: TimelineEntry) {
    providerConfigs.forEach { config ->
      try {
        val location = Location(config.name).apply {
          latitude = entry.latitude
          longitude = entry.longitude
          accuracy = 3f
          time = System.currentTimeMillis()
          speed = entry.speedMps.toFloat()
          elapsedRealtimeNanos = SystemClock.elapsedRealtimeNanos()
        }
        locationManager.setTestProviderLocation(config.name, location)
        Log.d(TAG, "Pushed mock location to ${config.name}: $entry")
      } catch (error: Exception) {
        Log.e(TAG, "Failed to push mock location to ${config.name}", error)
      }
    }
  }

  fun stop() {
    handler.removeCallbacksAndMessages(null)
    activeTargetRepeater?.let { handler.removeCallbacks(it) }
    activeTargetRepeater = null
    providerConfigs.forEach { config ->
      try {
        locationManager.setTestProviderEnabled(config.name, false)
      } catch (_: Exception) {
      }
    }
  }

  companion object {
    private const val TAG = "MockLocationController"
    private const val TARGET_PUSH_INTERVAL_MS = 1000L
    private const val TARGET_PUSH_DURATION_MS = 60_000L
  }
}
