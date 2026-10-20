// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import 'forge-std/Test.sol';
import '../ArcProofInvoices.sol';
contract LargeReturnReceiver { receive() external payable { assembly { return(0, 65536) } } }
contract LargeRevertReceiver { receive() external payable { assembly { revert(0, 65536) } } }
contract IndependentReturnDataReview is Test {
 function test_largeSuccessfulReturnForwardsOnlyCurrentPayment() public {
  ArcProofInvoices c=new ArcProofInvoices(); LargeReturnReceiver m=new LargeReturnReceiver();
  vm.deal(address(c),7 ether); vm.prank(address(m)); bytes32 id=c.createInvoice(0.2 ether,uint64(block.timestamp+1 days),bytes32(0));
  address p=address(0x12345); vm.deal(p,1 ether); vm.prank(p); c.payInvoice{value:0.2 ether,gas:500000}(id);
  assertTrue(c.getInvoice(id).paid); assertEq(address(c).balance,7 ether); assertEq(address(m).balance,0.2 ether); assertEq(p.balance,0.8 ether);
 }
 function test_largeRevertDataRollsBackCompletely() public {
  ArcProofInvoices c=new ArcProofInvoices(); LargeRevertReceiver m=new LargeRevertReceiver();
  vm.deal(address(c),7 ether); vm.prank(address(m)); bytes32 id=c.createInvoice(0.2 ether,uint64(block.timestamp+1 days),bytes32(0));
  address p=address(0x12345); vm.deal(p,1 ether); vm.prank(p); vm.expectRevert(ArcProofInvoices.MERCHANT_CALL_FAILED.selector); c.payInvoice{value:0.2 ether,gas:500000}(id);
  ArcProofInvoices.Invoice memory inv=c.getInvoice(id); assertFalse(inv.paid); assertEq(inv.payer,address(0)); assertEq(inv.paidAt,0); assertEq(inv.paidBlockNumber,0);
  assertEq(address(c).balance,7 ether); assertEq(address(m).balance,0); assertEq(p.balance,1 ether);
 }
}
