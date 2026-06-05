/* localStorage save/load. One slot for now. */
window.RW = window.RW || {};

RW.SAVE_KEY = 'runewars.save.v1';

RW.Save = {
  save(state) {
    try {
      localStorage.setItem(RW.SAVE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.warn('Save failed', e);
      return false;
    }
  },
  load() {
    try {
      const raw = localStorage.getItem(RW.SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('Load failed', e);
      return null;
    }
  },
  clear() {
    localStorage.removeItem(RW.SAVE_KEY);
  },
};
