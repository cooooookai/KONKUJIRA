# メンバー選択機能更新

## 📋 更新概要

Band Sync Calendarのユーザー識別機能を、自由入力のニックネームから**予定義された6人のメンバー選択**に変更しました。

## 🎯 主な変更点

### 1. **メンバー選択方式の変更**
- **変更前**: テキスト入力でニックネーム自由入力
- **変更後**: ドロップダウンで6人のメンバーから選択

### 2. **予定義メンバー**
```
1. COKAI
2. YUSUKE  
3. ZEN
4. YAMCHI
5. テスト
6. USER
```

### 3. **データ上書き仕様**
- 同じメンバーで新しいデータを保存すると、**以前のデータは上書き**される
- メンバー選択時にウェルカムメッセージで注意喚起

## 🔧 技術的変更

### 修正ファイル

#### 1. `src/frontend/index.html`
```html
<!-- 変更前 -->
<input type="text" id="nickname-input" placeholder="ニックネーム" maxlength="20">

<!-- 変更後 -->
<select id="member-select" class="member-select">
    <option value="">メンバーを選択...</option>
    <option value="COKAI">COKAI</option>
    <option value="YUSUKE">YUSUKE</option>
    <option value="ZEN">ZEN</option>
    <option value="YAMCHI">YAMCHI</option>
    <option value="テスト">テスト</option>
    <option value="USER">USER</option>
</select>
```

#### 2. `src/frontend/js/nickname.js`
- **クラス名**: `NicknameManager` (変更なし、互換性維持)
- **新プロパティ**: `predefinedMembers` 配列
- **主要メソッド変更**:
  - `validateInput()` → `validateSelection()`
  - `saveNickname()` → `saveMemberSelection()`
  - `showChangeDialog()` - メンバー選択用に更新

#### 3. `src/frontend/css/styles.css`
- `.member-selection` - 選択エリアのスタイル
- `.member-select` - ドロップダウンのスタイル
- `:disabled` 状態のボタンスタイル

### 新機能

#### 1. **バリデーション**
```javascript
validateSelection() {
    const selectedMember = select.value;
    const isValid = selectedMember && this.predefinedMembers.includes(selectedMember);
    submitBtn.disabled = !isValid;
}
```

#### 2. **ウェルカムメッセージ**
```javascript
showWelcomeMessage(memberName) {
    alert(`ようこそ、${memberName}さん！\n\n同じメンバーで新しいデータを保存すると、以前のデータは上書きされます。`);
}
```

#### 3. **メンバー変更ダイアログ**
- 現在のメンバーと利用可能なメンバー一覧を表示
- 無効なメンバー名の入力を防止

## 🧪 テスト

### テストファイル
`test-member-selection.html` - メンバー選択機能の動作確認用

### テスト項目
1. ✅ メンバー選択モーダルの表示
2. ✅ ドロップダウンからの選択
3. ✅ 選択ボタンの有効/無効切り替え
4. ✅ メンバー保存とウェルカムメッセージ
5. ✅ メンバー変更機能
6. ✅ メンバークリア機能
7. ✅ 無効なメンバー名の拒否

## 📱 ユーザー体験

### 改善点
1. **操作の簡素化**: タイピング不要、選択のみ
2. **データ整合性**: 予定義メンバーのみで重複防止
3. **明確な警告**: データ上書きについての事前通知
4. **視覚的改善**: ドロップダウンによる直感的な選択

### 使用フロー
```
1. アプリ起動
   ↓
2. メンバー選択モーダル表示
   ↓  
3. ドロップダウンからメンバー選択
   ↓
4. 「選択」ボタンクリック
   ↓
5. ウェルカムメッセージ表示
   ↓
6. アプリ利用開始
```

## 🔄 互換性

### 既存データ
- 既存のニックネームデータは保持される
- 予定義メンバー名と一致する場合はそのまま利用可能
- 一致しない場合は再選択が必要

### API互換性
- バックエンドAPIは変更なし
- `member_name`フィールドは引き続き使用
- データベーススキーマは変更なし

## 🚀 デプロイ

### 必要な作業
1. フロントエンドファイルの更新
2. GitHub Pagesへの再デプロイ
3. 機能テストの実行

### 確認事項
- [ ] メンバー選択機能の動作確認
- [ ] 既存データとの互換性確認  
- [ ] モバイル端末での表示確認
- [ ] 各メンバーでのデータ保存/上書き確認

## 📝 今後の拡張可能性

1. **メンバー管理機能**: 管理者によるメンバー追加/削除
2. **プロフィール機能**: メンバーごとのアバターや詳細情報
3. **権限管理**: メンバーごとの機能制限
4. **データ移行**: 旧ニックネームから新メンバーへの移行ツール

---

この更新により、Band Sync Calendarはより構造化され、データの整合性が向上し、ユーザー体験が改善されました。