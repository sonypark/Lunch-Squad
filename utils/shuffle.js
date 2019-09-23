module.exports = shuffle = (n) => {
    for (let i = n.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [n[i], n[j]] = [n[j], n[i]];
    }
    return n;
};