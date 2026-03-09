import { useState } from "react";
import { Map, MapControls, MapClusterLayer, MapMarker, MarkerContent, MarkerLabel, MarkerTooltip } from "@/components/ui/map";
import { useAppContext } from "../context/AppContext";
import regionsData from "@/data/psgc/regions.json";
import cityCentroids from "@/data/geo/city_centroids.json";

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function topBuckets(list, limit) {
  return list ? [...list].sort((a, b) => b.count - a.count).slice(0, limit) : [];
}

const regionCoordinatesByCode = {
  "1300000000": [121.033, 14.5995],
  "1400000000": [120.573, 17.3513],
  "0100000000": [120.2863, 16.6159],
  "0200000000": [121.774, 17.308],
  "0300000000": [120.719, 15.4826],
  "0400000000": [121.0779, 14.1667],
  "1700000000": [121.0, 12.5],
  "0500000000": [123.3778, 13.4204],
  "0600000000": [122.5726, 11.0049],
  "0700000000": [123.8854, 10.3157],
  "0800000000": [124.964, 12.2446],
  "0900000000": [122.0, 7.85],
  "1000000000": [124.6857, 8.4542],
  "1100000000": [125.6128, 7.1907],
  "1200000000": [124.6, 6.5],
  "1600000000": [125.5, 9.0],
  "1900000000": [124.25, 7.2]
};

const regionCoordinatesByName = {};
for (const region of regionsData) {
  const coords = regionCoordinatesByCode[region.code];
  if (coords) {
    regionCoordinatesByName[region.name] = coords;
  }
}

const cityCoordinatesByName = {};
for (const item of cityCentroids) {
  cityCoordinatesByName[item.name] = [item.lon, item.lat];
}

export default function Dashboard() {
  const { customers, token, result, insights, loadingInsights } = useAppContext();
  const [mapFilter, setMapFilter] = useState("regions");

  return (
    <>
      <section className="summary-grid">
        <div className="summary-card">
          <p className="label">Model</p>
          <p className="value">Logistic Regression</p>
          <p className="meta">Balanced classes - 20% holdout validation</p>
        </div>
        <div className="summary-card">
          <p className="label">Portfolio</p>
          <p className="value">{customers.length}</p>
          <p className="meta">Subscribers tracked</p>
        </div>
        <div className="summary-card">
          <p className="label">Session</p>
          <p className="value">{token ? "Authenticated" : "Guest"}</p>
          <p className="meta">Access control status</p>
        </div>
        <div className="summary-card">
          <p className="label">Latest Risk</p>
          <p className="value">{result ? result.risk_level : "-"}</p>
          <p className="meta">Most recent score</p>
        </div>
      </section>

      <section className="panel insights">
        <div className="panel-header">
          <h2>Telco Insights (Philippines)</h2>
          <p>Portfolio health snapshots based on current subscriber registry.</p>
        </div>
        {loadingInsights || !insights ? (
          <p role="status" aria-live="polite">
            Loading insights...
          </p>
        ) : (
          <div className="insight-grid">
            <div className="insight-card">
              <p className="label">ARPU</p>
              <p className="value">PHP {insights.avg_monthly_charges}</p>
              <p className="meta">Average monthly charges</p>
            </div>
            <div className="insight-card">
              <p className="label">Avg Tenure</p>
              <p className="value">{insights.avg_tenure} mo</p>
              <p className="meta">Customer lifespan</p>
            </div>
            <div className="insight-card">
              <p className="label">High Risk Rate</p>
              <p className="value">{formatPercent(insights.high_risk_rate)}</p>
              <p className="meta">Based on scored customers</p>
            </div>
            <div className="insight-list">
              <p className="label">Contract Mix</p>
              {insights.contract_mix.map((b) => (
                <div className="list-row" key={`contract-${b.label}`}>
                  <span>{b.label}</span>
                  <span>{b.count}</span>
                </div>
              ))}
            </div>
            <div className="insight-list">
              <p className="label">Internet Service</p>
              {insights.internet_mix.map((b) => (
                <div className="list-row" key={`internet-${b.label}`}>
                  <span>{b.label}</span>
                  <span>{b.count}</span>
                </div>
              ))}
            </div>
            <div className="insight-list">
              <p className="label">Tenure Buckets</p>
              {insights.tenure_buckets.map((b) => (
                <div className="list-row" key={`tenure-${b.label}`}>
                  <span>{b.label}</span>
                  <span>{b.count}</span>
                </div>
              ))}
            </div>
            <div className="insight-list">
              <p className="label">Risk Breakdown</p>
              {insights.risk_breakdown.map((b) => (
                <div className="list-row" key={`risk-${b.label}`}>
                  <span>{b.label}</span>
                  <span>{b.count}</span>
                </div>
              ))}
            </div>
            <div className="insight-list">
              <p className="label">Region Mix</p>
              {topBuckets(insights.region_mix, 10).map((b) => (
                <div className="list-row" key={`region-${b.label}`}>
                  <span>{b.label}</span>
                  <span>{b.count}</span>
                </div>
              ))}
            </div>
            <div className="insight-list">
              <p className="label">Province Mix</p>
              {topBuckets(insights.province_mix, 10).map((b) => (
                <div className="list-row" key={`province-${b.label}`}>
                  <span>{b.label}</span>
                  <span>{b.count}</span>
                </div>
              ))}
            </div>
            <div className="insight-list">
              <p className="label">City Mix</p>
              {topBuckets(insights.city_mix, 12).map((b) => (
                <div className="list-row" key={`city-${b.label}`}>
                  <span>{b.label}</span>
                  <span>{b.count}</span>
                </div>
              ))}
            </div>
            <div className="insight-list">
              <p className="label">Service Mix</p>
              {topBuckets(insights.service_mix, 8).map((b) => (
                <div className="list-row" key={`service-${b.label}`}>
                  <span>{b.label}</span>
                  <span>{b.count}</span>
                </div>
              ))}
            </div>
            <div className="insight-list">
              <p className="label">Plan Mix</p>
              {topBuckets(insights.plan_mix, 8).map((b) => (
                <div className="list-row" key={`plan-${b.label}`}>
                  <span>{b.label}</span>
                  <span>{b.count}</span>
                </div>
              ))}
            </div>
            <div className="insight-list">
              <p className="label">Top Regions by High Risk</p>
              {insights.region_high_risk
                .filter((b) => b.count > 0)
                .slice(0, 5)
                .map((b) => (
                  <div className="list-row" key={`high-region-${b.label}`}>
                    <span>{b.label}</span>
                    <span>
                      {b.count} ({formatPercent(b.rate)})
                    </span>
                  </div>
                ))}
            </div>
            <div className="insight-list">
              <p className="label">Top Cities by High Risk</p>
              {insights.city_high_risk
                .filter((b) => b.count > 0)
                .slice(0, 5)
                .map((b) => (
                  <div className="list-row" key={`high-city-${b.label}`}>
                    <span>{b.label}</span>
                    <span>
                      {b.count} ({formatPercent(b.rate)})
                    </span>
                  </div>
                ))}
            </div>
            <div className="insight-map">
              <div className="map-header">
                <p className="label">Geography Map</p>
                <div className="map-filters">
                  <button
                    className={mapFilter === "regions" ? "chip active" : "chip"}
                    onClick={() => setMapFilter("regions")}
                    type="button"
                    aria-pressed={mapFilter === "regions"}
                  >
                    Regions
                  </button>
                  <button
                    className={mapFilter === "regions_high" ? "chip active" : "chip"}
                    onClick={() => setMapFilter("regions_high")}
                    type="button"
                    aria-pressed={mapFilter === "regions_high"}
                  >
                    High Risk Regions
                  </button>
                  <button
                    className={mapFilter === "cities_high" ? "chip active" : "chip"}
                    onClick={() => setMapFilter("cities_high")}
                    type="button"
                    aria-pressed={mapFilter === "cities_high"}
                  >
                    High Risk Cities
                  </button>
                </div>
              </div>
              <div className="map-canvas">
                <Map
                  center={[121.774, 12.8797]}
                  zoom={4.2}
                  pitch={0}
                  bearing={0}
                  attributionControl={false}
                  className="map-surface"
                >
                  <MapControls position="top-right" showLocate={false} />
                  {mapFilter === "cities_high" ? (
                    <MapClusterLayer
                      data={{
                        type: "FeatureCollection",
                        features: insights.city_high_risk
                          .filter((c) => c.count > 0)
                          .map((item) => {
                            const coords = cityCoordinatesByName[item.label];
                            if (!coords) return null;
                            return {
                              type: "Feature",
                              properties: {
                                label: item.label,
                                count: item.count,
                                rate: item.rate
                              },
                              geometry: {
                                type: "Point",
                                coordinates: coords
                              }
                            };
                          })
                          .filter(Boolean)
                      }}
                      clusterColors={["#0b5cab", "#f59e0b", "#b91c1c"]}
                      pointColor="#b91c1c"
                    />
                  ) : (
                    (mapFilter === "regions_high"
                      ? insights.region_high_risk
                      : insights.region_mix
                    )
                      .filter(
                        (item) =>
                          mapFilter === "regions" || (item.count ?? 0) > 0
                      )
                      .slice()
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 8)
                      .map((item) => {
                        const coords = regionCoordinatesByName[item.label];
                        if (!coords) return null;
                        const isHigh = mapFilter !== "regions";
                        return (
                          <MapMarker
                            key={`map-${item.label}`}
                            longitude={coords[0]}
                            latitude={coords[1]}
                          >
                            <MarkerContent className="marker-wrap">
                              <div className={isHigh ? "marker-dot high" : "marker-dot"} />
                            </MarkerContent>
                            <MarkerLabel className="marker-label">
                              {item.label}
                            </MarkerLabel>
                            <MarkerTooltip className="marker-tooltip">
                              {item.label}: {item.count}
                              {typeof item.rate === "number"
                                ? ` (${formatPercent(item.rate)})`
                                : ""}
                            </MarkerTooltip>
                          </MapMarker>
                        );
                      })
                  )}
                </Map>
              </div>
              <div className="map-legend">
                <span
                  className={
                    mapFilter === "regions" ? "legend-dot" : "legend-dot high"
                  }
                />
                <span className="legend-text">
                  {mapFilter === "regions"
                    ? "Total subscribers"
                    : "High-risk subscribers"}
                </span>
              </div>
            </div>
          </div>
        )}
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>Workspace Guidance</h2>
          <p>Use the sidebar to switch between workflows.</p>
        </div>
        <ul className="guidance">
          <li>Login to unlock customer and user workflows.</li>
          <li>Customer Intake creates profiles and triggers a score.</li>
          <li>User Management is restricted to admins.</li>
          <li>Customer Registry is the portfolio view.</li>
        </ul>
      </section>
    </>
  );
}
