# Claude, "Give me the steps as a script I can run myself."

Copied with the panel's copy button. Host text below, unchanged.

I can't create or run macro files, but here's a VBA macro you can paste in and run yourself. It uses general rules rather than cell-by-cell fixes, so it will also work on similar contact lists. It repeats where the cleanup ended up: phone numbers in E.164 format, fixed name capitalization and real birth dates. Country spellings and row order are left alone.

**Assumed layout:** A = ID, B = FirstName, C = LastName, D = DOB, E = Country, F = Phone, headers in row 1. The macro writes the new phone column into G.

```vba
Option Explicit

Sub CleanContacts()
    Dim ws As Worksheet, lastRow As Long, r As Long, ccLast As Long
    Dim dt As Variant, badDates As Long, f As String

    Set ws = ActiveSheet
    lastRow = ws.Cells(ws.Rows.Count, "A").End(xlUp).Row
    If lastRow < 2 Then Exit Sub

    ccLast = EnsureCountryCodes()

    For r = 2 To lastRow
        ' 1) Name capitalization
        ws.Cells(r, 2).Value = FixName(CStr(ws.Cells(r, 2).Value))
        ws.Cells(r, 3).Value = FixName(CStr(ws.Cells(r, 3).Value))

        ' 2) Birth dates -> real dates (yyyy-mm-dd)
        If VarType(ws.Cells(r, 4).Value) <> vbDate Then
            dt = ParseDOB(CStr(ws.Cells(r, 4).Value), CStr(ws.Cells(r, 5).Value))
            If IsEmpty(dt) Then
                ws.Cells(r, 4).ClearContents
            ElseIf IsNull(dt) Then
                ws.Cells(r, 4).Interior.Color = vbYellow   ' couldn't parse - check manually
                badDates = badDates + 1
            Else
                ws.Cells(r, 4).NumberFormat = "yyyy-mm-dd"
                ws.Cells(r, 4).Value = dt
                ws.Cells(r, 4).HorizontalAlignment = xlRight
            End If
        End If
    Next r

    ' 3) Phone (E.164) formula column
    ws.Range("G1").Value = "Phone (E.164)"
    ws.Range("G1").Font.Bold = True
    f = "=LET(raw,TRIM(F2),IF(raw="""","""",LET(ch,MID(raw,SEQUENCE(LEN(raw)),1)," & _
        "d,CONCAT(IF(ISNUMBER(--ch),ch,"""")),cc,XLOOKUP(TRIM(E2),'Country Codes'!$A$2:$A$" & ccLast & _
        ",'Country Codes'!$B$2:$B$" & ccLast & ",""?""),IF(LEFT(raw,1)=""+"",""+""&d," & _
        "IF(LEFT(d,2)=""00"",""+""&MID(d,3,99),""+""&cc&IF(LEFT(d,1)=""0"",MID(d,2,99),d))))))"
    With ws.Range("G2:G" & lastRow)
        .NumberFormat = "General"
        .Formula2 = f
    End With
    ws.Columns("G").AutoFit

    MsgBox "Done. Rows: " & (lastRow - 1) & vbLf & _
           "Unparsed dates (yellow): " & badDates & vbLf & _
           "Any '+?' in column G = country missing from 'Country Codes'."
End Sub

' ---------- Country Codes lookup sheet ----------
Private Function EnsureCountryCodes() As Long
    Dim cs As Worksheet, list As Variant, i As Long, n As Long
    On Error Resume Next
    Set cs = ThisWorkbook.Worksheets("Country Codes")
    On Error GoTo 0
    If cs Is Nothing Then
        Set cs = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
        cs.Name = "Country Codes"
    End If
    cs.Range("A1:B1").Value = Array("Country", "Dial Code")
    cs.Range("A1:B1").Font.Bold = True

    list = Array("United States", "1", "Canada", "1", "United Kingdom", "44", "Australia", "61", _
                 "Bahamas", "1", "Croatia", "385", "Germany", "49", "Spain", "34", "China", "86", _
                 "Japan", "81", "Saudi Arabia", "966", "USA", "1", "UK", "44", "England", "44", _
                 "The Bahamas", "1", "Deutschland", "49")

    For i = 0 To UBound(list) Step 2
        If IsError(Application.Match(list(i), cs.Columns("A"), 0)) Then
            n = cs.Cells(cs.Rows.Count, "A").End(xlUp).Row + 1
            cs.Cells(n, 1).Value = list(i)
            cs.Cells(n, 2).NumberFormat = "@"
            cs.Cells(n, 2).Value = list(i + 1)
            cs.Cells(n, 2).Font.Color = RGB(0, 0, 255)
        End If
    Next i
    cs.Columns("A:B").AutoFit
    EnsureCountryCodes = cs.Cells(cs.Rows.Count, "A").End(xlUp).Row
End Function

' ---------- Names ----------
Private Function FixName(ByVal s As String) As String
    Dim w() As String, i As Long, x As String
    If Len(Trim(s)) = 0 Then FixName = s: Exit Function
    w = Split(Trim(s), " ")
    For i = 0 To UBound(w)
        x = w(i)
        ' only touch all-lowercase words that have letter case (skips McDonald, Müller, 张, etc.)
        If x = LCase(x) And LCase(x) <> UCase(x) Then
            Select Case x
                Case "van", "der", "den", "de", "von", "da", "di", "du", "la", "le", "del", "della", "ter", "ten"
                    ' keep name particles lowercase
                Case Else
                    If Left(x, 2) = "mc" And Len(x) > 2 Then
                        x = "Mc" & UCase(Mid(x, 3, 1)) & Mid(x, 4)
                    ElseIf Left(x, 2) = "o'" And Len(x) > 2 Then
                        x = "O'" & UCase(Mid(x, 3, 1)) & Mid(x, 4)
                    Else
                        x = UCase(Left(x, 1)) & Mid(x, 2)
                    End If
            End Select
            w(i) = x
        End If
    Next i
    FixName = Join(w, " ")
End Function

' ---------- Dates ----------
' Returns Empty (placeholder -> clear), Null (unparseable), or a Date
Private Function ParseDOB(ByVal s As String, ByVal country As String) As Variant
    Dim t As String, p() As String, tok As Variant, i As Long, suf As Variant
    Dim y As Long, m As Long, d As Long, a As Long, b As Long

    s = Trim(Replace(s, "'", ""))
    If Right(s, 1) = "." Then s = Left(s, Len(s) - 1)
    Select Case UCase(s)
        Case "", "NA", "N/A", "-", "NULL", "NONE": ParseDOB = Empty: Exit Function
    End Select

    t = Replace(Replace(Replace(s, "_", "-"), "/", "-"), ".", "-")
    If IsDigitsAndDashes(t) Then
        p = Split(t, "-")
        If UBound(p) = 2 Then
            If Len(p(0)) = 4 Then
                y = Val(p(0)): m = Val(p(1)): d = Val(p(2))
            ElseIf Len(p(2)) = 4 Then
                y = Val(p(2)): a = Val(p(0)): b = Val(p(1))
                If a > 12 Then
                    d = a: m = b
                ElseIf b > 12 Then
                    m = a: d = b
                ElseIf IsUS(country) Then
                    m = a: d = b          ' US: month first
                Else
                    d = a: m = b          ' elsewhere: day first
                End If
            End If
        End If
    Else
        t = LCase(s)
        t = Replace(Replace(Replace(t, " of ", " "), ",", " "), ".", " ")
        For i = 0 To 9
            For Each suf In Array("st", "nd", "rd", "th")
                t = Replace(t, i & suf, CStr(i))
            Next suf
        Next i
        For Each tok In Split(Application.WorksheetFunction.Trim(t), " ")
            If IsNumeric(tok) Then
                If Len(tok) = 4 Then y = Val(tok) Else d = Val(tok)
            Else
                m = MonthNum(CStr(tok))
            End If
        Next tok
    End If

    If y > 1800 And m >= 1 And m <= 12 And d >= 1 And d <= 31 Then
        ParseDOB = DateSerial(y, m, d)
    Else
        ParseDOB = Null
    End If
End Function

Private Function IsDigitsAndDashes(ByVal t As String) As Boolean
    Dim i As Long, c As String
    If Len(t) = 0 Then Exit Function
    For i = 1 To Len(t)
        c = Mid(t, i, 1)
        If Not (c Like "#" Or c = "-") Then Exit Function
    Next i
    IsDigitsAndDashes = True
End Function

Private Function IsUS(ByVal c As String) As Boolean
    Select Case UCase(Trim(c))
        Case "USA", "US", "UNITED STATES", "UNITED STATES OF AMERICA": IsUS = True
    End Select
End Function

Private Function MonthNum(ByVal tok As String) As Long
    Dim k As String: k = Left(LCase(tok), 3)
    Select Case k
        Case "jan": MonthNum = 1
        Case "feb": MonthNum = 2
        Case "mar", "m" & ChrW(228) & "r", "mrz": MonthNum = 3   ' incl. German März
        Case "apr": MonthNum = 4
        Case "may", "mai": MonthNum = 5
        Case "jun": MonthNum = 6
        Case "jul": MonthNum = 7
        Case "aug": MonthNum = 8
        Case "sep": MonthNum = 9
        Case "oct", "okt": MonthNum = 10
        Case "nov": MonthNum = 11
        Case "dec", "dez": MonthNum = 12
    End Select
End Function
```

**How to run it:**
1. **Back up the file first.** Macro changes can't be undone with Ctrl+Z.
2. Open **Tools → Macro → Visual Basic Editor**, choose **Insert → Module**, and paste the code in.
3. Select the contact sheet, then run **CleanContacts** from **Tools → Macro → Macros**.
4. If you want to keep the macro in the file, save it as **.xlsm**.

**What to know:**
- **New countries:** the dialling-code list only covers the countries in this data. Any other country shows `+?` in column G; add it to Country Codes and the formula will pick it up.
- **Unreadable dates:** any date it can't read is left as it is and highlighted yellow.
- **Dates that could be read either way:** the macro assumes month first for the US and day first everywhere else, the same as I did here.
- **Names:** the macro only changes names that are entirely lowercase. Names that already have capitals (like McDonald) and names in scripts without capitals are left alone.
- **Length check:** the macro doesn't flag numbers that look too short; that part I did by hand here.

I haven't run this macro myself, since I can only change the workbook directly, so try it on a copy first.
