// Erzeugt die Kartendaten für das Geografie-Spiel (einmalig, aus world-atlas)
import { readFileSync, writeFileSync } from "node:fs";
import * as topojson from "topojson-client";
import { geoPath, geoNaturalEarth1, geoConicConformal, geoCentroid, geoArea } from "d3-geo";

const topo = JSON.parse(readFileSync("node_modules/world-atlas/countries-50m.json", "utf8"));
const topoLow = JSON.parse(readFileSync("node_modules/world-atlas/countries-110m.json", "utf8"));
const countries = topojson.feature(topo, topo.objects.countries); // Ziel-Länder: fein
const countriesLow = topojson.feature(topoLow, topoLow.objects.countries); // Hintergrund: grob
const land = topojson.feature(topoLow, topoLow.objects.land);

const C = (id, name, flag) => ({ id: String(id).padStart(3, "0"), name, flag });
const EUROPA = [C(276,"Deutschland","🇩🇪"),C(250,"Frankreich","🇫🇷"),C(380,"Italien","🇮🇹"),C(724,"Spanien","🇪🇸"),C(620,"Portugal","🇵🇹"),C(826,"Großbritannien","🇬🇧"),C(372,"Irland","🇮🇪"),C(616,"Polen","🇵🇱"),C(40,"Österreich","🇦🇹"),C(756,"Schweiz","🇨🇭"),C(528,"Niederlande","🇳🇱"),C(56,"Belgien","🇧🇪"),C(300,"Griechenland","🇬🇷"),C(752,"Schweden","🇸🇪"),C(578,"Norwegen","🇳🇴"),C(208,"Dänemark","🇩🇰"),C(246,"Finnland","🇫🇮"),C(203,"Tschechien","🇨🇿"),C(348,"Ungarn","🇭🇺"),C(191,"Kroatien","🇭🇷"),C(642,"Rumänien","🇷🇴"),C(100,"Bulgarien","🇧🇬"),C(804,"Ukraine","🇺🇦"),C(352,"Island","🇮🇸"),C(792,"Türkei","🇹🇷"),C(504,"Marokko","🇲🇦"),C(788,"Tunesien","🇹🇳"),C(12,"Algerien","🇩🇿")];
const WELT = [C(276,"Deutschland","🇩🇪"),C(250,"Frankreich","🇫🇷"),C(724,"Spanien","🇪🇸"),C(380,"Italien","🇮🇹"),C(826,"Großbritannien","🇬🇧"),C(792,"Türkei","🇹🇷"),C(504,"Marokko","🇲🇦"),C(818,"Ägypten","🇪🇬"),C(710,"Südafrika","🇿🇦"),C(566,"Nigeria","🇳🇬"),C(404,"Kenia","🇰🇪"),C(450,"Madagaskar","🇲🇬"),C(682,"Saudi-Arabien","🇸🇦"),C(643,"Russland","🇷🇺"),C(156,"China","🇨🇳"),C(356,"Indien","🇮🇳"),C(392,"Japan","🇯🇵"),C(764,"Thailand","🇹🇭"),C(360,"Indonesien","🇮🇩"),C(36,"Australien","🇦🇺"),C(554,"Neuseeland","🇳🇿"),C(840,"USA","🇺🇸"),C(124,"Kanada","🇨🇦"),C(484,"Mexiko","🇲🇽"),C(76,"Brasilien","🇧🇷"),C(32,"Argentinien","🇦🇷"),C(152,"Chile","🇨🇱"),C(170,"Kolumbien","🇨🇴"),C(304,"Grönland","🇬🇱")];

function build(list, projection, W, H, file, src = countries) {
  const path = geoPath(projection).digits(1);
  const feats = list.map((c) => {
    const f = src.features.find((x) => x.id === c.id);
    if (!f) { console.error("fehlt", c); return null; }
    // Größte Landmasse für die Mitte (USA ohne Alaska/Hawaii, Frankreich ohne Guayana)
    let main = f;
    if (f.geometry.type === "MultiPolygon") {
      const polys = f.geometry.coordinates.map((co) => ({ type: "Feature", geometry: { type: "Polygon", coordinates: co } }));
      main = polys.sort((a, b) => geoArea(b) - geoArea(a))[0];
    }
    const [cx, cy] = path.centroid(main);
    const b = path.bounds(main);
    return { id: c.id, name: c.name, flag: c.flag, d: path(f), cx: +cx.toFixed(1), cy: +cy.toFixed(1), size: +Math.max(b[1][0] - b[0][0], b[1][1] - b[0][1]).toFixed(1) };
  }).filter(Boolean);
  const out = { w: W, h: H, land: path(land), all: countriesLow.features.map((f) => path(f)).join(""), countries: feats };
  writeFileSync(file, JSON.stringify(out));
  console.log(file, (JSON.stringify(out).length / 1024).toFixed(0), "KB", feats.length, "Länder");
}

// Welt
build(WELT, geoNaturalEarth1().fitSize([1000, 520], land).clipExtent([[0, 0], [1000, 520]]), 1000, 520, "public/geo/welt.json", countriesLow);
// Europa: konforme Kegelprojektion, auf Europa zugeschnitten
const euBox = { type: "Feature", geometry: { type: "Polygon", coordinates: [[[-25, 30], [-25, 72], [45, 72], [45, 30], [-25, 30]]] } };
const eu = geoConicConformal().parallels([40, 60]).rotate([-10, 0]).fitSize([1000, 700], euBox).clipExtent([[0, 0], [1000, 700]]);
build(EUROPA, eu, 1000, 700, "public/geo/europa.json");
