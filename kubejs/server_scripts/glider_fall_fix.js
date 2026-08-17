// Фикс фантомного урона от падения при использовании глайдера (мод vc_gliders).
//
// Диагностика (09.07.2026, по [glider_debug]):
//  - фантом = fall-урон, начисленный модом по СВОЕЙ запомненной высоте: приходит
//    через ~0.5-0.6 с после закрытия купола с уроном ~16 при серверном
//    fallDistance ~1.5 (ванилла с такой высоты дала бы 0);
//  - честный урон согласован с fallDistance (например 2.52 при 5.66 ≈ fd-3);
//  - замечены "реплеи": точный дубль урона с тем же fallDistance спустя секунды.
//
// Логика:
//  Слой 1: пока глайдер раскрыт — обнуляем fallDistance (+короткий грейс
//          RESET_GRACE_MS на рассинхрон приземления). Долгого грейса НЕТ,
//          чтобы не съедать честные падения сразу после закрытия.
//  Слой 2: fall-урон гасится (setNewDamage(0)):
//          - всегда, пока глайдер раскрыт;
//          - в течение GRACE_MS после закрытия — ТОЛЬКО если урон "фантомный",
//            т.е. заметно больше максимально возможного ванильного для текущего
//            fallDistance (damage > fd - 3 + MARGIN). Честный урон проходит.
//
// ГРАБЛИ ЭТОЙ ВЕРСИИ KubeJS (2101.7.2):
//  - внутри обработчиков только var (const/let -> "redeclaration of var" у Rhino);
//  - тип урона: строго вызов e.source.getType() (RemapForJS c getMsgId);
//    свойство .type возвращает саму функцию, getMsgId() не находится.

var GliderUtil = null;
try {
  GliderUtil = Java.loadClass('net.venturecraft.gliders.util.GliderUtil');
} catch (err) {
  console.warn('[glider_fall_fix] GliderUtil не найден, скрипт неактивен: ' + err);
}

var ServerPlayerClass = Java.loadClass('net.minecraft.server.level.ServerPlayer');

var DEBUG = true;           // подробный лог урона и состояния глайдера
var RESET_GRACE_MS = 300;   // слой 1: сброс fallDistance ещё чуть-чуть после закрытия
var GRACE_MS = 2000;        // слой 2: окно охоты на фантомный урон после закрытия
var PHANTOM_MARGIN = 1.0;   // запас сверх ванильного максимума (fd - 3)
var lastGlide = {};         // entityId -> Date.now() последнего активного глайда
var wasGliding = {};        // entityId -> последнее известное состояние (для лога)
var lastFall = {};          // entityId -> {d, fd, t} последнего fall-урона (анти-реплей)
var REPLAY_MS = 15000;      // окно, в котором точный дубль fall-урона считается реплеем
var disabledTick = false;   // самоотключение слоёв ПО ОТДЕЛЬНОСТИ при ошибке
var disabledHurt = false;

PlayerEvents.tick(e => {
  if (disabledTick || !GliderUtil) return;
  if (e.level.isClientSide()) return;

  var player = e.player;
  try {
    var gliding = GliderUtil.isGlidingWithActiveGlider(player);
    var key = player.getId();

    if (DEBUG && gliding !== (wasGliding[key] === true)) {
      wasGliding[key] = gliding;
      console.info('[glider_debug] ' + player.getName().getString()
        + ': глайдер ' + (gliding ? 'ОТКРЫТ' : 'ЗАКРЫТ')
        + ', fallDistance=' + player.fallDistance);
    }

    if (gliding) {
      lastGlide[key] = Date.now();
      player.resetFallDistance();
    } else if (lastGlide[key] !== undefined && (Date.now() - lastGlide[key]) <= RESET_GRACE_MS) {
      player.resetFallDistance();
    }
  } catch (err) {
    disabledTick = true;
    console.warn('[glider_fall_fix] тик-слой отключён из-за ошибки (сообщи разработчику): ' + err);
  }
});

// Слой 2: гасим фантомный fall-урон, честный пропускаем.
EntityEvents.beforeHurt(e => {
  if (disabledHurt || !GliderUtil) return;
  try {
    var entity = e.entity;
    if (!(entity instanceof ServerPlayerClass)) return;

    var src = e.source;
    var srcId = src ? ('' + src.getType()) : '<null>';
    var glidingNow = GliderUtil.isGlidingWithActiveGlider(entity);
    var t = lastGlide[entity.getId()];
    var sinceGlide = (t === undefined) ? -1 : (Date.now() - t);

    if (DEBUG) {
      console.info('[glider_debug] УРОН ' + entity.getName().getString()
        + ': тип=' + srcId
        + ' величина=' + e.damage
        + ' глайдерСейчас=' + glidingNow
        + ' послеГлайда=' + (sinceGlide < 0 ? 'никогда' : sinceGlide + 'мс')
        + ' fallDistance=' + entity.fallDistance);
    }

    if (srcId !== 'fall') return;

    // Анти-реплей: мод(ы) иногда повторно доставляют тот же fall-урон
    // (замечен точный дубль: та же величина и тот же fallDistance до 7-го знака
    // спустя секунды). Честное совпадение обоих чисел практически невозможно.
    var key2 = entity.getId();
    var prev = lastFall[key2];
    var nowMs = Date.now();
    if (prev && (nowMs - prev.t) <= REPLAY_MS
        && Math.abs(prev.d - e.damage) < 0.001
        && Math.abs(prev.fd - entity.fallDistance) < 0.001) {
      e.setDamage(0);
      console.info('[glider_fall_fix] погашен РЕПЛЕЙ fall-урона: ' + entity.getName().getString()
        + ' (повтор ' + e.damage + ' при том же fallDistance спустя ' + (nowMs - prev.t) + 'мс)');
      return;
    }
    lastFall[key2] = { d: e.damage, fd: entity.fallDistance, t: nowMs };

    if (glidingNow) {
      e.setDamage(0); // у события есть только setDamage(float), setNewDamage нет (проверено javap)
      console.info('[glider_fall_fix] погашен fall-урон (глайдер раскрыт): ' + entity.getName().getString());
      return;
    }

    var inGrace = (sinceGlide >= 0) && (sinceGlide <= GRACE_MS);
    if (!inGrace) return; // вне окна глайда не вмешиваемся вообще

    // Максимум, который ванилла могла бы дать с текущего fallDistance.
    var maxVanilla = Math.max(0, entity.fallDistance - 3) + PHANTOM_MARGIN;
    var dmg = e.damage; // читаем до обнуления, иначе в лог попадает 0
    if (dmg > maxVanilla) {
      e.setDamage(0);
      console.info('[glider_fall_fix] погашен ФАНТОМНЫЙ fall-урон: ' + entity.getName().getString()
        + ' (урон ' + dmg + ' > допустимого ' + maxVanilla + ' при fallDistance=' + entity.fallDistance + ')');
    } else if (DEBUG) {
      console.info('[glider_debug] fall-урон признан честным, пропущен: ' + entity.getName().getString());
    }
  } catch (err) {
    disabledHurt = true;
    console.warn('[glider_fall_fix] hurt-хук отключён из-за ошибки (сообщи разработчику): ' + err);
  }
});
