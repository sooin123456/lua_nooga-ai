type LuaIntakeLoadingScreenProps = {
  fallbackMessage?: string | null;
  onBack(): void;
};

export function LuaIntakeLoadingScreen({
  fallbackMessage,
  onBack,
}: LuaIntakeLoadingScreenProps) {
  return (
    <main className="screen lua-intake-loading-screen">
      <header className="review-brief">
        <button className="review-brief__back" type="button" onClick={onBack}>
          돌아가기
        </button>
        <p>루아 사건 접수</p>
        <h1>루아가 싸움 일지를 정리하고 있어요</h1>
        <span>카톡 말투와 앞뒤 상황을 A/B 주장으로 나누는 중이에요.</span>
      </header>

      <section className="lua-intake-loading" aria-label="루아 정리 중">
        <div className="lua-intake-loading__character" aria-hidden="true">
          <span>Lua</span>
        </div>
        <strong>00:00:03</strong>
        <p>잠깐만 기다려주세요. 루아가 증거를 사건 일지로 바꾸고 있어요.</p>
        {fallbackMessage ? <small>{fallbackMessage}</small> : null}
      </section>
    </main>
  );
}
