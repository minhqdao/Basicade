10 REM =====================================================
20 REM  CLK FUNCTION TESTS - Comprehensive Suite
30 REM  Tests: CLK(0), CLK(X), CLK$
40 REM  Validates: range, precision, Oregon Trail pattern
50 REM =====================================================
60 FAILURES = 0
70 TESTS = 0
80 REM
90 REM ===== TEST GROUP 1: CLK(0) BASIC =====
100 GOSUB 1000
110 REM ===== TEST GROUP 2: CLK(X) ARGUMENTS =====
120 GOSUB 2000
130 REM ===== TEST GROUP 3: CLK$ STRING =====
140 GOSUB 3000
150 REM ===== TEST GROUP 4: ELAPSED TIME =====
160 GOSUB 4000
170 REM ===== TEST GROUP 5: OREGON TRAIL PATTERN =====
180 GOSUB 5000
190 REM
200 REM ===== SUMMARY =====
210 PRINT
220 PRINT "========================================="
230 PRINT "RESULTS: ";TESTS;" tests, ";FAILURES;" failures"
240 PRINT "========================================="
250 IF FAILURES = 0 THEN 270
260 PRINT "*** SOME TESTS FAILED ***"
265 END 1
270 PRINT "*** ALL TESTS PASSED ***"
280 END
290 REM
999 REM =========================================================
1000 REM GROUP 1: CLK(0) BASIC FUNCTION
1010 REM =========================================================
1020 PRINT "--- GROUP 1: CLK(0) ---"
1030 REM
1040 REM Test 1.1: Returns a number >= 0
1050 TESTS = TESTS + 1
1060 N = CLK(0)
1070 A = 0
1080 IF N >= 0 THEN A = 1
1090 M$ = "1.1 CLK(0) >= 0"
1100 GOSUB 9000
1110 REM
1120 REM Test 1.2: Value is < 24
1130 TESTS = TESTS + 1
1140 N = CLK(0)
1150 A = 0
1160 IF N < 24 THEN A = 1
1170 M$ = "1.2 CLK(0) < 24"
1180 GOSUB 9000
1190 REM
1200 REM Test 1.3: Consecutive calls return similar values
1210 TESTS = TESTS + 1
1220 N1 = CLK(0)
1230 N2 = CLK(0)
1240 D = N2 - N1
1250 IF D < 0 THEN D = 0 - D
1260 A = 0
1270 IF D < 0.001 THEN A = 1
1280 M$ = "1.3 consecutive calls differ by < 0.001"
1290 GOSUB 9000
1300 REM
1310 REM Test 1.4: CLK(0) in PRINT does not crash
1320 TESTS = TESTS + 1
1330 PRINT "  1.4 CLK(0) raw: ";CLK(0)
1340 A = 1
1350 M$ = "1.4 CLK(0) in PRINT works"
1360 GOSUB 9000
1370 REM
1380 REM Test 1.5: CLK(0) * 1 stays valid
1390 TESTS = TESTS + 1
1400 V = CLK(0) * 1
1410 A = 0
1420 IF V >= 0 THEN A = 1
1430 IF V >= 24 THEN A = 0
1440 M$ = "1.5 CLK(0)*1 in range"
1450 GOSUB 9000
1460 REM
1470 REM Test 1.6: INT(CLK(0)) is integer
1480 TESTS = TESTS + 1
1490 T = INT(CLK(0))
1500 A = 0
1510 IF T >= 0 THEN A = 1
1520 IF T >= 24 THEN A = 0
1530 M$ = "1.6 INT(CLK(0)) in range 0-23"
1540 GOSUB 9000
1550 RETURN
1560 REM
1999 REM =========================================================
2000 REM GROUP 2: CLK(X) WITH VARIOUS ARGUMENTS
2010 REM =========================================================
2020 PRINT "--- GROUP 2: CLK(X) ARGUMENTS ---"
2030 REM
2040 REM Test 2.1: CLK(1) returns valid time
2050 TESTS = TESTS + 1
2060 N = CLK(1)
2070 A = 0
2080 IF N >= 0 THEN A = 1
2090 IF N >= 24 THEN A = 0
2100 M$ = "2.1 CLK(1) in range"
2110 GOSUB 9000
2120 REM
2130 REM Test 2.2: CLK(100) returns valid time
2140 TESTS = TESTS + 1
2150 N = CLK(100)
2160 A = 0
2170 IF N >= 0 THEN A = 1
2180 IF N >= 24 THEN A = 0
2190 M$ = "2.2 CLK(100) in range"
2200 GOSUB 9000
2210 REM
2220 REM Test 2.3: CLK(-1) returns valid time
2230 TESTS = TESTS + 1
2240 N = CLK(-1)
2250 A = 0
2260 IF N >= 0 THEN A = 1
2270 IF N >= 24 THEN A = 0
2280 M$ = "2.3 CLK(-1) in range"
2290 GOSUB 9000
2300 REM
2310 REM Test 2.4: Multiple CLK calls are consistent
2320 TESTS = TESTS + 1
2330 N0 = CLK(0)
2340 N1 = CLK(0)
2350 N2 = CLK(0)
2360 D = N2 - N0
2370 IF D < 0 THEN D = 0 - D
2380 A = 0
2390 IF D < 0.001 THEN A = 1
2400 M$ = "2.4 multiple calls consistent"
2410 GOSUB 9000
2420 RETURN
2430 REM
2999 REM =========================================================
3000 REM GROUP 3: CLK$ STRING FUNCTION
3010 REM =========================================================
3020 PRINT "--- GROUP 3: CLK$ STRING ---"
3030 REM
3040 REM Test 3.1: CLK$ returns non-empty string
3050 TESTS = TESTS + 1
3060 S$ = CLK$
3070 A = 0
3080 IF LEN(S$) > 0 THEN A = 1
3090 M$ = "3.1 CLK$ non-empty"
3100 GOSUB 9000
3110 REM
3120 REM Test 3.2: CLK$ length is 8 (HH:MM:SS)
3130 TESTS = TESTS + 1
3140 S$ = CLK$
3150 A = 0
3160 IF LEN(S$) = 8 THEN A = 1
3170 M$ = "3.2 CLK$ length=8"
3180 GOSUB 9000
3190 REM
3200 REM Test 3.3: CLK$ has colons
3210 TESTS = TESTS + 1
3220 S$ = CLK$
3230 C1$ = MID$(S$, 3, 1)
3240 C2$ = MID$(S$, 6, 1)
3250 A = 0
3260 IF C1$ = ":" THEN A = 1
3270 IF C2$ = ":" THEN A = A + 1
3280 IF A = 2 THEN A = 1 ELSE A = 0
3290 M$ = "3.3 CLK$ has colons"
3300 GOSUB 9000
3310 REM
3320 REM Test 3.4: CLK$ hour part is 0-23
3330 TESTS = TESTS + 1
3340 S$ = CLK$
3350 H$ = LEFT$(S$, 2)
3360 H = VAL(H$)
3370 A = 0
3380 IF H >= 0 THEN A = 1
3390 IF H > 23 THEN A = 0
3400 M$ = "3.4 CLK$ hour 0-23"
3410 GOSUB 9000
3420 REM
3430 REM Test 3.5: CLK$ minute part is 0-59
3440 TESTS = TESTS + 1
3450 S$ = CLK$
3460 MN$ = MID$(S$, 4, 2)
3470 MN = VAL(MN$)
3480 A = 0
3490 IF MN >= 0 THEN A = 1
3500 IF MN > 59 THEN A = 0
3510 M$ = "3.5 CLK$ minute 0-59"
3520 GOSUB 9000
3530 REM
3540 REM Test 3.6: CLK$ second part is 0-59
3550 TESTS = TESTS + 1
3560 S$ = CLK$
3570 SC$ = MID$(S$, 7, 2)
3580 SC = VAL(SC$)
3590 A = 0
3600 IF SC >= 0 THEN A = 1
3610 IF SC > 59 THEN A = 0
3620 M$ = "3.6 CLK$ second 0-59"
3630 GOSUB 9000
3640 RETURN
3650 REM
3999 REM =========================================================
4000 REM GROUP 4: ELAPSED TIME MEASUREMENT
4010 REM =========================================================
4020 PRINT "--- GROUP 4: ELAPSED TIME ---"
4030 REM
4040 REM Test 4.1: Immediate delta is >= 0
4050 TESTS = TESTS + 1
4060 T1 = CLK(0)
4070 T2 = CLK(0)
4080 D = T2 - T1
4090 A = 0
4100 IF D >= 0 THEN A = 1
4110 M$ = "4.1 T2-T1 >= 0"
4120 GOSUB 9000
4130 REM
4140 REM Test 4.2: Elapsed time after loop
4150 TESTS = TESTS + 1
4160 T1 = CLK(0)
4170 FOR J = 1 TO 100
4180 NEXT J
4190 T2 = CLK(0)
4200 SECS = T2 - T1
4210 SECS = SECS * 3600
4220 A = 0
4230 IF SECS >= 0 THEN A = 1
4240 M$ = "4.2 elapsed sec >= 0 after loop"
4250 GOSUB 9000
4260 REM
4270 REM Test 4.3: Oregon Trail formula works
4280 TESTS = TESTS + 1
4290 D9 = 3
4300 B3 = CLK(0)
4310 FOR J = 1 TO 500
4320 NEXT J
4330 B1 = CLK(0)
4340 B1 = ((B1 - B3) * 3600) - (D9 - 1)
4350 A = 0
4360 IF B1 >= -2 THEN A = 1
4370 M$ = "4.3 Oregon Trail formula >= -2"
4380 GOSUB 9000
4390 REM
4400 REM Test 4.4: Three measurements are ordered
4410 TESTS = TESTS + 1
4420 A1 = CLK(0)
4430 FOR J = 1 TO 100
4440 NEXT J
4450 A2 = CLK(0)
4460 FOR J = 1 TO 100
4470 NEXT J
4480 A3 = CLK(0)
4490 A = 0
4500 IF A2 >= A1 THEN A = 1
4510 IF A3 < A2 THEN A = 0
4520 M$ = "4.4 measurements are ordered"
4530 GOSUB 9000
4540 RETURN
4550 REM
4999 REM =========================================================
5000 REM GROUP 5: OREGON TRAIL SHOOTING PATTERN
5010 REM =========================================================
5020 PRINT "--- GROUP 5: OREGON TRAIL PATTERN ---"
5030 REM
5040 REM Simulates the shooting subroutine from oregon.bas lines 6210-6280
5050 REM
5060 REM Test 5.1: Pattern with D9=1 (ACE)
5070 TESTS = TESTS + 1
5080 D9 = 1
5090 GOSUB 5550
5100 A = 0
5110 IF B1 > -1 THEN A = 1
5120 M$ = "5.1 shooting D9=1"
5130 GOSUB 9000
5140 REM
5150 REM Test 5.2: Pattern with D9=3 (FAIR)
5160 TESTS = TESTS + 1
5170 D9 = 3
5180 GOSUB 5550
5190 A = 0
5200 IF B1 > -3 THEN A = 1
5210 M$ = "5.2 shooting D9=3"
5220 GOSUB 9000
5230 REM
5240 REM Test 5.3: Pattern with D9=5 (SHAKY)
5250 TESTS = TESTS + 1
5260 D9 = 5
5270 GOSUB 5550
5280 A = 0
5290 IF B1 > -5 THEN A = 1
5300 M$ = "5.3 shooting D9=5"
5310 GOSUB 9000
5320 REM
5330 REM Test 5.4: CLK(0) does not crash in tight loop
5340 TESTS = TESTS + 1
5350 FOR J = 1 TO 50
5360 V = CLK(0)
5370 NEXT J
5380 A = 1
5390 M$ = "5.4 CLK(0) tight loop 50x"
5400 GOSUB 9000
5410 REM
5420 REM Test 5.5: CLK(0) in subtraction pattern
5430 TESTS = TESTS + 1
5440 C1 = CLK(0)
5450 C2 = CLK(0)
5460 DIFF = C2 - C1
5470 DIFF = DIFF * 3600
5480 A = 0
5490 IF DIFF >= 0 THEN A = 1
5500 M$ = "5.5 CLK subtraction >= 0"
5510 GOSUB 9000
5520 RETURN
5530 REM
5540 REM
5550 REM Subroutine: simulate Oregon Trail shooting
5560 REM Input: D9 = difficulty level
5570 REM Output: B1 = response time score
5580 B3 = CLK(0)
5590 REM Instead of INPUT, simulate a typing delay
5600 FOR J = 1 TO 200
5610 NEXT J
5620 B1 = CLK(0)
5630 B1 = ((B1-B3)*3600) - (D9-1)
5640 PRINT "  Score: ";B1;" (D9=";D9;")"
5650 RETURN
5660 REM
8999 REM =========================================================
9000 REM SUBROUTINE: ASSERT(condition, message)
9010 REM A = condition (1 = pass, 0 = fail)
9020 REM M$ = test message
9030 REM =========================================================
9040 IF A THEN 9070
9050 PRINT "  FAIL: ";M$
9060 FAILURES = FAILURES + 1
9065 RETURN
9070 PRINT "  PASS: ";M$
9080 RETURN
9090 REM
