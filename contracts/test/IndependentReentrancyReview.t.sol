// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import 'forge-std/Test.sol';
import '../ArcProofInvoices.sol';
contract ExactReentryReceiver {
 ArcProofInvoices public c; bytes32 public id; bool public bubble; bool public createMode; bytes4 public caught;
 constructor(ArcProofInvoices target) { c=target; }
 function configure(bytes32 target,bool shouldBubble,bool shouldCreate) external {id=target;bubble=shouldBubble;createMode=shouldCreate;}
 receive() external payable {
  bytes memory data=createMode?abi.encodeCall(c.createInvoice,(1e12,uint64(block.timestamp+1 hours),bytes32(0))):abi.encodeCall(c.payInvoice,(id));
  (bool ok,bytes memory result)=address(c).call{value:createMode?0:msg.value}(data);
  require(!ok,'REENTRY SUCCEEDED'); caught=bytes4(result);
  if(bubble) {assembly {revert(add(result,32),mload(result))}}
 }
}
contract IndependentReentrancyReview is Test {
 function test_actualUncaughtSameInvoiceFullRollback() public {
  ArcProofInvoices c=new ArcProofInvoices(); ExactReentryReceiver m=new ExactReentryReceiver(c);
  vm.warp(10000);vm.roll(123);vm.deal(address(c),7 ether);vm.prank(address(m));bytes32 id=c.createInvoice(0.2 ether,20000,bytes32(uint256(9)));m.configure(id,true,false);
  address p=address(0x12345);vm.deal(p,1 ether);vm.prank(p);vm.expectRevert(ArcProofInvoices.MERCHANT_CALL_FAILED.selector);c.payInvoice{value:0.2 ether}(id);
  ArcProofInvoices.Invoice memory inv=c.getInvoice(id);assertFalse(inv.paid);assertEq(inv.payer,address(0));assertEq(inv.paidAt,0);assertEq(inv.paidBlockNumber,0);
  assertEq(inv.merchant,address(m));assertEq(inv.amountNative,0.2 ether);assertEq(inv.expiresAt,20000);assertEq(inv.termsHash,bytes32(uint256(9)));
  assertEq(c.nextNonce(address(m)),1);assertEq(address(c).balance,7 ether);assertEq(p.balance,1 ether);assertEq(address(m).balance,0);assertEq(m.caught(),bytes4(0));
 }
 function test_exactGuardSelectorsSameCrossAndCreate() public {
  ArcProofInvoices c=new ArcProofInvoices();ExactReentryReceiver m=new ExactReentryReceiver(c);address p=address(0x12345);vm.deal(p,2 ether);
  for(uint i=0;i<3;i++) {
   vm.prank(address(m));bytes32 id=c.createInvoice(0.2 ether,uint64(block.timestamp+1 days),bytes32(0));bytes32 target=id;
   if(i==1){vm.prank(address(0x8888));target=c.createInvoice(0.2 ether,uint64(block.timestamp+1 days),bytes32(0));}
   m.configure(target,false,i==2);vm.prank(p);c.payInvoice{value:0.2 ether}(id);
   assertEq(m.caught(),bytes4(keccak256('ReentrancyGuardReentrantCall()')));assertTrue(c.getInvoice(id).paid);
   if(i==1) assertFalse(c.getInvoice(target).paid);
  }
  assertEq(c.nextNonce(address(m)),3);assertEq(address(m).balance,0.6 ether);assertEq(address(c).balance,0);
 }
}
